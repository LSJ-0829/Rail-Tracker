import networksData from '../data/networks.json';
import linesData from '../data/lines.json';

export const ALL_LINES = linesData;

export const SERVICE_NETWORKS = networksData
  .filter((n) => n.id !== 'physical')
  .map((net) => ({
    ...net,
    lines: ALL_LINES.filter((l) => l.networkId === net.id && l.kind === 'urban'),
  }));

export const ALL_STATION_NAMES = Array.from(
  new Set(linesData.flatMap((l) => l.stations || []))
).sort();

const PASSENGER_PHYSICAL_LINE_IDS = new Set([
  'gyeongbu-gosok-full', 'honam-gosok-full', 'suseo-pyeongtaek-gosok-full',
  'gyeongbu-full', 'honam-full', 'jeolla-full', 'gyeongjeon-full', 'jungang-full',
  'donghae-full', 'janghang-full', 'chungbuk-full', 'yeongdong-full', 'taebaek-full',
  'jeongseon-full', 'gyeongbuk-full', 'jungbunaeryuk-full', 'gwangju-seon-full',
  'seohae-south-full'
]);

const PASSENGER_STATION_MAP = {};
ALL_LINES.forEach((l) => {
  if (PASSENGER_PHYSICAL_LINE_IDS.has(l.id)) {
    (l.stations || []).forEach((st) => {
      if (!PASSENGER_STATION_MAP[st]) {
        PASSENGER_STATION_MAP[st] = new Set();
      }
      PASSENGER_STATION_MAP[st].add(l.name);
    });
  }
});

export function hasOfficialColor(line) {
  return Boolean(line && line.color);
}

export function displayColor(line) {
  if (hasOfficialColor(line)) return line.color;
  return '#262626'; // Default dark neutral color for physical lines
}

export function getUnderlyingPhysicalIds(line) {
  if (!line) return [];
  if (line.kind === 'physical') return [line.id];
  if (line.physicalLineId) return [line.physicalLineId];
  if (line.physicalSegments && Array.isArray(line.physicalSegments)) {
    return Array.from(new Set(line.physicalSegments.map((s) => s.physicalLineId)));
  }
  // 용인 에버라인·인천 1/2호선·의정부경전철처럼 공유 선로가 없어 별도의 물리 노선 항목이 없는
  // 단독 운행계통은 자기 자신의 id를 물리 id로 취급한다. (빈 배열을 반환하면 splitTripBySegments가
  // 기록을 line.id로 저장하는 것과 어긋나서, 기록은 저장되는데 화면엔 영영 안 뜨는 버그가 있었다.)
  return [line.id];
}

export function getPhysicalStations(line) {
  if (!line) return [];
  if (line.kind === 'physical') return line.stations || [];
  return line.stations || [];
}

// 용인 에버라인·인천 1/2호선·대구/부산/대전/광주 도시철도처럼 다른 노선과 선로를 공유하지 않는
// 단독 운행계통은 별도의 물리 노선 항목이 없다(getUnderlyingPhysicalIds가 자기 자신 id를 물리 id로 씀).
// "노선으로 찾기"에서도 이런 노선을 볼 수 있어야 하고, 전체 완주율 집계에도 빠지면 안 되므로
// 물리 노선 목록에 함께 포함시킨다.
export function getPhysicalLineList() {
  const physical = ALL_LINES.filter((l) => l.kind === 'physical');
  const standaloneUrban = ALL_LINES.filter(
    (l) => l.kind === 'urban' && !l.physicalLineId && !(l.physicalSegments && l.physicalSegments.length)
  );
  return [...physical, ...standaloneUrban];
}

export function deriveServiceCoverage(line, trips) {
  const coverage = new Set();
  const physicalIds = getUnderlyingPhysicalIds(line);
  physicalIds.forEach((pid) => {
    const list = trips[pid] || [];
    list.forEach((t) => {
      const stations = getPhysicalStations(ALL_LINES.find((l) => l.id === pid));
      const i1 = stations.indexOf(t.from);
      const i2 = stations.indexOf(t.to);
      if (i1 !== -1 && i2 !== -1) {
        const start = Math.min(i1, i2);
        const end = Math.max(i1, i2);
        for (let i = start; i <= end; i++) {
          coverage.add(stations[i]);
        }
      }
    });
  });
  return coverage;
}

export function computeLineStats(line, visitedSet, trips) {
  const stations = getPhysicalStations(line);
  const totalStations = stations.length;
  const visitedStations = stations.filter((s) => visitedSet.has(s)).length;
  const totalSegments = Math.max(0, totalStations - 1);
  const coverage = deriveServiceCoverage(line, trips);
  let riddenSegments = 0;
  for (let i = 0; i < stations.length - 1; i++) {
    if (coverage.has(stations[i]) && coverage.has(stations[i + 1])) {
      riddenSegments++;
    }
  }
  return { totalStations, visitedStations, totalSegments, riddenSegments };
}

export function computePhysicalLineStats(trips) {
  const physicalLines = getPhysicalLineList();
  return physicalLines.map((l) => {
    const totalSegments = Math.max(0, (l.stations || []).length - 1);
    const covered = derivedPhysicalSegments(l.stations || [], trips[l.id] || []);
    const riddenSegments = covered.size;
    const pct = totalSegments ? Math.round((riddenSegments / totalSegments) * 100) : 0;
    return {
      ...l,
      totalSegments,
      riddenSegments,
      pct,
    };
  });
}

export function derivedPhysicalSegments(stations, tripList) {
  const covered = new Set();
  if (!tripList || !Array.isArray(tripList)) return covered;
  tripList.forEach((t) => {
    const i1 = stations.indexOf(t.from);
    const i2 = stations.indexOf(t.to);
    if (i1 !== -1 && i2 !== -1) {
      const start = Math.min(i1, i2);
      const end = Math.max(i1, i2);
      for (let i = start; i < end; i++) {
        covered.add(`${i}-${i+1}`);
      }
    }
  });
  return covered;
}

export function computePhysicalRegistry() {
  const map = new Map();
  getPhysicalLineList().forEach((l) => {
    map.set(l.id, l.stations || []);
  });
  return map;
}

export function getStationStyles(line, transferInfo) {
  const stations = getPhysicalStations(line);
  const lineHasColor = hasOfficialColor(line);
  const lineCol = displayColor(line);
  const info = transferInfo || getTransferInfo(line);

  return stations.map((st) => {
    if (lineHasColor) {
      return { station: st, colored: true, color: lineCol };
    }
    // getTransferInfo와 동일한 지역/동명이역 필터를 통과한 목록에서 대표 노선 색을 가져온다.
    // (예전에는 필터 없이 이름만으로 아무 도시철도 노선이나 매칭해서, 경부선 "상동"역이
    // 부천 7호선 "상동"역과 이름이 겹친다는 이유만으로 올리브색으로 잘못 칠해지던 버그가 있었다.)
    const urbanAtStation = (info[st] && info[st].urban) || [];
    const colored = urbanAtStation.length > 0;
    const color = colored ? urbanAtStation[0].color : '#262626';
    return { station: st, colored, color };
  });
}

export function getTransferInfo(currentLine) {
  if (!currentLine || !currentLine.stations) return {};

  // family 기반 중복 제거는 "같은 운행계통의 하위 지선"을 걸러내기 위한 것이라 urban 노선끼리
  // 비교할 때만 의미가 있다. 물리 노선(수인선(남부), 분당선, 경의선 등)은 이름이 우연히 같은 접두어로
  // 시작한다는 이유만으로 자기 자신과 대응하는 도시철도 노선이 통째로 걸러지면 안 된다.
  // (예: 수인선(남부) 물리 노선에서 수원역을 볼 때 "수인·분당선"이 family가 같다는 이유로 사라지던 버그)
  const currentFamily = currentLine.kind === 'urban' ? getLineFamily(currentLine) : '';
  const transferMap = {};
  const urbanLines = ALL_LINES.filter((l) => l.kind === 'urban');

  currentLine.stations.forEach((st, stIdx) => {
    const connectedUrban = [];

    urbanLines.forEach((l) => {
      if (l.id === currentLine.id) return;
      if (!l.stations.includes(st)) return;

      // 순수 동명이역 예외: 지역/노선군이 겹쳐서 다른 필터를 통과하더라도, 실제로는 별개 위치인
      // 역 이름 우연 일치(예: 중앙선 "양평"(경기 양평) vs 5호선 "양평"(서울 영등포), 경의중앙선
      // "가좌"(서울 서대문) vs 인천 2호선 "가좌"(인천 서구))는 여기서 직접 걸러낸다.
      if (isPureNameCollision(st, currentLine.id, l.id)) return;

      const otherFamily = getLineFamily(l);

      // Check explicit branch junction exceptions (성수, 신도림, 강동, 구로, 병점, 금천구청, 가좌)
      let isBranchJunction = false;
      if (st === '성수' && ('s2' === currentLine.id || 's2' === l.id) && ('s2b1' === currentLine.id || 's2b1' === l.id)) {
        isBranchJunction = true;
      } else if (st === '신도림' && ('s2' === currentLine.id || 's2' === l.id) && ('s2b2' === currentLine.id || 's2b2' === l.id)) {
        isBranchJunction = true;
      } else if (st === '강동' && ('s5-hanam' === currentLine.id || 's5-hanam' === l.id) && ('s5-macheon' === currentLine.id || 's5-macheon' === l.id)) {
        isBranchJunction = true;
      } else if (st === '병점' && ('s1-seodongtan' === currentLine.id || 's1-seodongtan' === l.id)) {
        isBranchJunction = true;
      } else if (st === '구로' && ('s1-gyeongbu' === currentLine.id || 's1-gyeongbu' === l.id) && ('s1-gyeongin' === currentLine.id || 's1-gyeongin' === l.id)) {
        isBranchJunction = true;
      } else if (st === '금천구청' && ('gwangmyeong-shuttle' === currentLine.id || 'gwangmyeong-shuttle' === l.id)) {
        isBranchJunction = true;
      } else if (st === '가좌' && ('gj' === currentLine.id || 'gj' === l.id) && ('gyeongui-seoul' === currentLine.id || 'gyeongui-seoul' === l.id)) {
        isBranchJunction = true;
      }

      // If same line family and NOT a branch junction, skip (deduplicate sub-branches)
      if (currentFamily && otherFamily && currentFamily === otherFamily && !isBranchJunction) {
        return;
      }

      // Regional scoping: 완전히 다른 지역에 있는 동명이역(예: 경부선 "용산" vs 대구 도시철도 "용산")이
      // 이름만 같다는 이유로 환승역 취급되는 걸 막는다.
      // 도시철도 노선은 networkId 하나로 지역이 고정되지만, 물리 노선(경부선 등)은 여러 지역을 관통하므로
      // regions 배열 전체가 아니라 해당 역 위치(regionBoundaries)를 기준으로 그 역이 실제로 속한 지역만 사용한다.
      const currentRegions = getStationRegions(currentLine, stIdx);
      const otherRegions = getStationRegions(l, l.stations.indexOf(st));
      if (currentRegions.length > 0 && otherRegions.length > 0 && !currentRegions.some((r) => otherRegions.includes(r))) {
        return;
      }

      connectedUrban.push({ line: l, isBranchJunction });
    });

    // 같은 운행계통(예: 경의중앙선 본선 gj / 경의선 gyeongui-seoul)이 겹치는 구간에서 서로 다른
    // 노선처럼 중복 표시되는 것을 막는다. 실제로 갈라지는 분기점(가좌 등)은 위에서 이미
    // isBranchJunction으로 표시해뒀으니 여기서는 건드리지 않고, 대표 노선만 남긴다.
    const familyGroups = new Map();
    connectedUrban.forEach((item) => {
      if (item.isBranchJunction) return;
      const fam = getLineFamily(item.line);
      const repId = FAMILY_REPRESENTATIVES[fam];
      if (!repId) return;
      if (!familyGroups.has(fam)) familyGroups.set(fam, []);
      familyGroups.get(fam).push(item);
    });
    familyGroups.forEach((items, fam) => {
      if (items.length <= 1) return;
      const repId = FAMILY_REPRESENTATIVES[fam];
      items.forEach((item) => {
        if (item.line.id === repId) return;
        const idx = connectedUrban.indexOf(item);
        if (idx !== -1) connectedUrban.splice(idx, 1);
      });
    });

    const uniqueUrban = [];
    const seenNames = new Set();

    connectedUrban.forEach(({ line: l, isBranchJunction }) => {
      const cleanName = simplifyLineName(l.name, currentLine.id, l.id, isBranchJunction);
      if (!seenNames.has(cleanName)) {
        seenNames.add(cleanName);
        uniqueUrban.push({
          id: l.id,
          name: cleanName,
          color: displayColor(l),
          fullName: l.name,
        });
      }
    });

    const passengerSet = PASSENGER_STATION_MAP[st];
    const hasPassenger = Boolean(passengerSet && passengerSet.size > 0);
    const passengerLines = hasPassenger ? Array.from(passengerSet).sort() : [];

    if (uniqueUrban.length > 0 || hasPassenger) {
      transferMap[st] = {
        urban: uniqueUrban,
        hasPassenger,
        passengerLines,
      };
    }
  });

  return transferMap;
}

// 같은 운행계통으로 묶이는 family 중, 환승역 표시에서 대표로 남길 노선.
// (예: 경의중앙선 본선 gj / 경의선 gyeongui-seoul은 같은 계통이므로 gj만 대표로 남긴다.
// 실제로 갈라지는 분기점은 isBranchJunction으로 별도 처리되므로 이 목록과 무관하게 둘 다 보인다.)
const FAMILY_REPRESENTATIVES = {
  '경의중앙선': 'gj',
};

// 이름만 우연히 같을 뿐 실제로는 다른 위치에 있는 역 쌍(순수 동명이역).
// 지역/노선군 필터를 다 통과하더라도 이 목록에 있으면 환승역으로 취급하지 않는다.
const PURE_NAME_COLLISIONS = {
  '양평': [
    ['jungang-full', 's5-hanam'], // 경기 양평군 중앙선 양평역 vs 서울 영등포구 5호선 양평역
    ['jungang-full', 's5-macheon'],
  ],
  '가좌': [
    ['gj', 'ic2'], // 서울 서대문구 경의중앙선 가좌역 vs 인천 서구 인천 2호선 가좌역
    ['gyeongui-seoul', 'ic2'],
    ['gyeongui-full', 'ic2'],
  ],
};

function isPureNameCollision(st, idA, idB) {
  const pairs = PURE_NAME_COLLISIONS[st];
  if (!pairs) return false;
  return pairs.some(([a, b]) => (a === idA && b === idB) || (a === idB && b === idA));
}

// 물리 노선(경부선 등)이 여러 지역을 관통할 때, 해당 역이 실제로 속한 지역만 반환한다.
// regionBoundaries가 없으면(단일 지역 노선 등) 기존처럼 regions 배열 전체를 반환한다.
function getStationRegions(line, stationIdx) {
  if (!line) return [];
  if (line.kind === 'physical') {
    if (line.regionBoundaries && line.regionBoundaries.length > 0 && stationIdx !== -1) {
      const stations = line.stations || [];
      for (const b of line.regionBoundaries) {
        const boundaryIdx = stations.indexOf(b.upTo);
        if (boundaryIdx === -1 || stationIdx <= boundaryIdx) return [b.region];
      }
      return [line.regionBoundaries[line.regionBoundaries.length - 1].region];
    }
    return line.regions || [];
  }
  return line.networkId ? [line.networkId] : [];
}

function getLineFamily(line) {
  if (!line || !line.name) return '';
  if (line.name.startsWith('1호선')) return '1호선';
  if (line.name.startsWith('2호선')) return '2호선';
  if (line.name.startsWith('3호선')) return '3호선';
  if (line.name.startsWith('4호선')) return '4호선';
  if (line.name.startsWith('5호선')) return '5호선';
  if (line.name.startsWith('6호선')) return '6호선';
  if (line.name.startsWith('7호선')) return '7호선';
  if (line.name.startsWith('8호선')) return '8호선';
  if (line.name.startsWith('9호선')) return '9호선';
  if (line.name.startsWith('수인') || line.name.startsWith('분당')) return '수인분당선';
  if (line.name.startsWith('경의')) return '경의중앙선';
  return line.name;
}

function simplifyLineName(name, currentLineId, targetLineId, isBranchJunction) {
  if (isBranchJunction) {
    if (targetLineId === 's2b1') return '2호선 성수지선';
    if (targetLineId === 's2b2') return '2호선 신정지선';
    if (targetLineId === 's5-macheon') return '5호선 마천지선';
    if (targetLineId === 's1-seodongtan') return '1호선 서동탄행';
    if (targetLineId === 'gwangmyeong-shuttle') return '1호선 광명셔틀';
  }

  if (name.startsWith('1호선')) return '1호선';
  if (name.startsWith('2호선')) return '2호선';
  if (name.startsWith('3호선')) return '3호선';
  if (name.startsWith('4호선')) return '4호선';
  if (name.startsWith('5호선')) return '5호선';
  if (name.startsWith('6호선')) return '6호선';
  if (name.startsWith('7호선')) return '7호선';
  if (name.startsWith('8호선')) return '8호선';
  if (name.startsWith('9호선')) return '9호선';
  return name;
}

export function splitTripBySegments(line, from, to) {
  const underlyingIds = getUnderlyingPhysicalIds(line);
  if (underlyingIds.length <= 1) {
    return [{ physicalLineId: underlyingIds[0] || line.id, from, to }];
  }

  const stations = line.stations || [];
  const idxFrom = stations.indexOf(from);
  const idxTo = stations.indexOf(to);

  // 역을 못 찾으면(데이터 문제 등) 예전처럼 안전하게 첫 물리 노선에 통째로 저장
  if (idxFrom === -1 || idxTo === -1) {
    return [{ physicalLineId: underlyingIds[0] || line.id, from, to }];
  }

  // 실제로 탄 방향: from이 to보다 노선상 앞이면 정방향, 아니면 역방향
  const forward = idxFrom <= idxTo;
  const lowIdx = Math.min(idxFrom, idxTo);
  const highIdx = Math.max(idxFrom, idxTo);

  // physicalSegments의 upTo 역을 기준으로 각 물리 노선이 담당하는 역 인덱스 범위를 계산.
  // 경계역은 앞 구간의 끝이자 다음 구간의 시작으로 공유된다 (예: 4호선 당고개 = 진접선 끝 = 서울4호선 시작)
  let segStart = 0;
  const ranges = (line.physicalSegments || []).map((seg) => {
    const endIdx = stations.indexOf(seg.upTo);
    const range = {
      physicalLineId: seg.physicalLineId,
      start: segStart,
      end: endIdx === -1 ? stations.length - 1 : endIdx,
    };
    segStart = range.end;
    return range;
  });

  const parts = [];
  ranges.forEach(({ physicalLineId, start, end }) => {
    const subStart = Math.max(start, lowIdx);
    const subEnd = Math.min(end, highIdx);
    if (subStart >= subEnd) return; // 경계역만 스쳐 지나갈 뿐, 이 물리 노선은 실제로 타지 않음
    const a = stations[subStart];
    const b = stations[subEnd];
    // 정방향이면 a(앞역)→b(뒷역), 역방향이면 b(뒷역)→a(앞역)로 저장해 실제 이동 방향을 보존
    parts.push({
      physicalLineId,
      from: forward ? a : b,
      to: forward ? b : a,
    });
  });

  return parts.length ? parts : [{ physicalLineId: underlyingIds[0] || line.id, from, to }];
}
