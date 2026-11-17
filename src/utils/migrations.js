// 노선 데이터(lines.json)를 고치면서 역이 빠지거나 이름이 바뀌면, 이미 저장된 기록(trip의
// from/to 역 이름)이 새 역 목록에서 찾을 수 없게 되어 완주율 계산에서 조용히 빠진다.
// 그래서 데이터 버전을 올릴 때마다 저장된 기록을 한 번만 새 역 목록에 맞게 옮긴다.
//
// 원칙(기존 완주 기록을 잃지 않기):
// - 옮기기 전 원본 전체를 별도 키에 백업한다(이미 백업이 있으면 덮어쓰지 않는다).
// - 기록을 지우지 않는다. 역이 빠진 끝점은 그 기록이 실제로 지나간 다른 물리 노선 구간으로
//   나눠서 옮긴다(예: 경부고속선 서울역→부산역 = 경부선 서울역→금천구청 + 광명연결선
//   금천구청→광명 + 경부고속선 광명→부산역).
// - 바뀐 기록에는 원래 값(orig)을 남겨 둔다.

export const CURRENT_DATA_VERSION = 3;

const LINK = 'gwangmyeong-link-full';

// v3 (2026-11 노선 데이터 점검)
// lineId -> { 없어진 역: { to: 대신 쓸 역, chain: [[물리노선, 없어진 역 쪽 끝, ...], ...] } }
// chain은 "없어진 역 → 대신 쓸 역" 방향으로 실제 지나간 다른 노선 구간들이다.
const V3_ENDPOINT_RULES = {
  'gyeongbu-gosok-full': {
    '서울역': { to: '광명', chain: [['gyeongbu-full', '서울역', '금천구청'], [LINK, '금천구청', '광명']] },
    '용산': { to: '광명', chain: [['gyeongbu-full', '용산', '금천구청'], [LINK, '금천구청', '광명']] },
    '영등포': { to: '광명', chain: [['gyeongbu-full', '영등포', '금천구청'], [LINK, '금천구청', '광명']] },
    '행신': {
      to: '광명',
      chain: [['gyeongui-full', '행신', '서울역'], ['gyeongbu-full', '서울역', '금천구청'], [LINK, '금천구청', '광명']],
    },
  },
  'honam-gosok-full': {
    '나주': { to: '광주송정역', chain: [['honam-full', '나주', '광주송정역']] },
    '목포': { to: '광주송정역', chain: [['honam-full', '목포', '광주송정역']] },
  },
  'jungang-full': {
    '태화강': { to: '경주', chain: [['donghae-full', '태화강', '경주']] },
    '서경주': { to: '경주', chain: [] },
    '탑리': { to: '의성', chain: [] },
    '화본': { to: '군위', chain: [] },
    '신녕': { to: '군위', chain: [] },
    '북영천': { to: '영천', chain: [] },
  },
  'daegu-seon-full': {
    '동대구역': { to: '가천', chain: [['gyeongbu-full', '동대구역', '가천']] },
    '금호': { to: '금호(영천)', chain: [] },
    // 예전 데이터에 잘못 섞여 있던 대구 도시철도 1호선 역들. 대구선 가천~하양 사이에 해당.
    ...Object.fromEntries(
      ['동구청', '아양교', '동촌', '해안', '방촌', '용계', '율하', '신기', '반야월', '각산', '안심', '대구한의대병원', '부호']
        .map((s) => [s, { to: '청천', chain: [] }])
    ),
  },
};

// 모든 노선 공통 역명 변경(같은 이름의 다른 역이 없는 경우만)
const V3_RENAMES = { '신경주': '경주' };

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function migrateTripsV3(trips) {
  const out = {};
  const push = (pid, t) => {
    if (!out[pid]) out[pid] = [];
    out[pid].push(t);
  };

  Object.entries(trips || {}).forEach(([pid, list]) => {
    (list || []).forEach((trip) => {
      const orig = trip.orig || { lineId: pid, from: trip.from, to: trip.to };
      const from = V3_RENAMES[trip.from] || trip.from;
      const to = V3_RENAMES[trip.to] || trip.to;
      const rules = V3_ENDPOINT_RULES[pid] || {};
      const rf = rules[from];
      const rt = rules[to];
      if (!rf && !rt) {
        push(pid, from === trip.from && to === trip.to ? trip : { ...trip, from, to, orig });
        return;
      }

      // 실제로 지나간 경로를 [노선, 출발, 도착] 구간 목록으로 만든다:
      // 출발 쪽 체인 → 원래 노선(대신 쓸 역끼리) → 도착 쪽 체인(거꾸로)
      const path = [];
      if (rf) rf.chain.forEach((seg) => path.push([...seg]));
      path.push([pid, rf ? rf.to : from, rt ? rt.to : to]);
      if (rt) [...rt.chain].reverse().forEach(([lp, a, b]) => path.push([lp, b, a]));

      // 같은 노선 구간이 이어지면 합치고(되돌아간 구간은 상쇄), 길이 0인 구간은 버린다.
      // 예: 경부고속선 행신→서울역 기록 = 경의선 행신→서울역 하나만 남는다.
      const merged = [];
      path.forEach((seg) => {
        if (seg[1] === seg[2]) return;
        const last = merged[merged.length - 1];
        if (last && last[0] === seg[0] && last[2] === seg[1]) {
          last[2] = seg[2];
          if (last[1] === last[2]) merged.pop();
        } else {
          merged.push(seg);
        }
      });

      // 원래 노선 구간은 원래 id를 유지하고, 나머지는 같은 날짜·열차·메모를 가진 새 기록으로 만든다.
      let keptId = false;
      merged.forEach(([lp, a, b]) => {
        const reuse = lp === pid && !keptId;
        if (reuse) keptId = true;
        push(lp, { ...trip, id: reuse ? trip.id : makeId(), from: a, to: b, orig });
      });
    });
  });
  return out;
}

// 저장된 원본(parsed)을 받아 최신 버전으로 옮긴 결과를 돌려준다. 옮길 것이 없으면 null.
export function migrateProgress(parsed, storage, storageKey) {
  if (!parsed) return null;
  const version = parsed.dataVersion || 2;
  if (version >= CURRENT_DATA_VERSION) return null;

  const backupKey = `${storageKey}-backup-v${version}`;
  try {
    if (storage && !storage.getItem(backupKey)) storage.setItem(backupKey, JSON.stringify(parsed));
  } catch (e) {
    // 백업을 못 쓰면 옮기지 않는다(원본 보존 우선)
    console.error('기록 백업 실패 - 데이터 이전을 건너뜁니다', e);
    return null;
  }

  let next = { ...parsed };
  if (version < 3) {
    next.trips = migrateTripsV3(parsed.trips);
    next.visited = (parsed.visited || []).map((s) => V3_RENAMES[s] || s);
  }
  next.dataVersion = CURRENT_DATA_VERSION;
  return next;
}
