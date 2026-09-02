import networksData from '../data/networks.json';
import linesData from '../data/lines.json';

export const ALL_LINES = linesData;

export const SERVICE_NETWORKS = networksData
  .filter((n) => n.id !== 'physical')
  .map((net) => ({
    ...net,
    lines: ALL_LINES.filter((l) => l.networkId === net.id && l.kind === 'urban'),
  }));

// passengerAccessible: false인 노선(부전선·우암선 등 화물 전용)의 역은 어떤 화면에서도 탈 수
// 없으므로, 전체 역 방문율 분모에서도 빼야 한다. 안 그러면 신선대처럼 다른 노선에는 전혀 안 나오는
// 역이 영원히 "미방문"으로 남아 100% 완주가 불가능해진다.
export const ALL_STATION_NAMES = Array.from(
  new Set(linesData.filter((l) => l.passengerAccessible !== false).flatMap((l) => l.stations || []))
).sort();

const PASSENGER_PHYSICAL_LINE_IDS = new Set([
  'gyeongbu-gosok-full', 'honam-gosok-full', 'suseo-pyeongtaek-gosok-full',
  'gyeongbu-full', 'honam-full', 'jeolla-full', 'gyeongjeon-full', 'jungang-full',
  'donghae-full', 'janghang-full', 'chungbuk-full', 'yeongdong-full', 'taebaek-full',
  'jeongseon-full', 'gyeongbuk-full', 'jungbunaeryuk-full', 'gwangju-seon-full',
  'seohae-south-full'
]);

// 역 이름 -> [{ lineId, lineName, stationIdx }] 목록. 위치(stationIdx)를 함께 저장해두는 이유는
// 여객 표시(hasPassenger)도 지역이 서로 다른 동명이역을 걸러내려면 그 역이 물리 노선 상 정확히
// 어디에 있는지를 알아야 지역(getStationRegions)을 계산할 수 있기 때문.
const PASSENGER_STATION_ENTRIES = {};
ALL_LINES.forEach((l) => {
  if (PASSENGER_PHYSICAL_LINE_IDS.has(l.id)) {
    // passengerStops: 도시철도와 선로를 공유하는 구간(1호선 경부·장항선, 경의중앙선, 부산 동해선
    // 광역전철 등)에서는 물리 노선의 전체 역 목록(stations)에 통근형 전용 역까지 다 들어있어서,
    // 그 목록을 그대로 쓰면 무궁화호 등이 서지 않는 역까지 "여객열차 정차"로 잘못 표시된다.
    // 그래서 이런 노선은 실제 여객열차가 정차하는 역만 골라낸 passengerStops를 대신 쓴다
    // (다른 순수 시외/고속 노선은 겹치는 도시철도가 없어 stations 전체가 곧 정차역이라 그대로 사용).
    // stationIdx는 반드시 stations(전체 목록) 기준 위치를 저장해야 한다 — getStationRegions가
    // regionBoundaries를 stations 배열 인덱스로 비교하므로, passengerStops(부분집합)에서의
    // 위치를 넣으면 지역 판정이 틀어진다.
    const fullStations = l.stations || [];
    (l.passengerStops || fullStations).forEach((st) => {
      if (!PASSENGER_STATION_ENTRIES[st]) {
        PASSENGER_STATION_ENTRIES[st] = [];
      }
      PASSENGER_STATION_ENTRIES[st].push({ lineId: l.id, lineName: l.name, stationIdx: fullStations.indexOf(st) });
    });
  }
});

// 이름만 같을 뿐 실제로는 다른 곳에 있는 역(동명이역)은 데이터 안에서 "판교(서천)"처럼 구분
// 표기해서 방문 기록·구간 기록이 서로 섞이지 않게 한다(위 주석 참고). 다만 사용자에게는 굳이
// 그 구분 표기를 보여줄 필요가 없으므로, 화면에 역 이름을 표시하는 모든 곳(역 마커 라벨,
// 구간 선택 드롭다운, 기록 목록 등)에서는 이 함수를 거쳐 원래 역명만 보여준다.
// 주의: "진부(오대산)"처럼 괄호가 실제 공식 역명의 일부인 경우도 있어서, 괄호를 무조건 잘라내는
// 정규식 대신 이 세션에서 실제로 구분 표기를 추가한 역만 명시적으로 나열한다.
const DISPLAY_NAME_OVERRIDES = {
  '판교(서천)': '판교',
  '상동(밀양)': '상동',
  '양원(봉화)': '양원',
  '쌍용(영월)': '쌍용',
  '가좌(인천)': '가좌',
  '양평(영등포)': '양평',
};

export function displayStationName(name) {
  return DISPLAY_NAME_OVERRIDES[name] || name;
}

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
//
// 부전선·우암선처럼 여객 운행계통이 아예 없는(화물 전용) 물리 노선은 passengerAccessible: false로
// 표시해 데이터에는 남겨두되(다른 노선의 physicalSegments가 참조할 가능성, 향후 참고용) "노선으로
// 찾기"와 완주 통계에서는 제외한다. 사용자가 실제로 탈 수 없는 구간을 완주율 분모에 넣는 건 의미가
// 없기 때문.
export function getPhysicalLineList() {
  const physical = ALL_LINES.filter((l) => l.kind === 'physical' && l.passengerAccessible !== false);
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

// 알려진 한계: 서울 2호선(seoul2-full/s2)처럼 순환선이라 배열 처음·끝에 같은 역 이름(시청)이
// 두 번 나오는 노선에서는 indexOf가 항상 첫 번째(0번) 시청만 찾는다. 그래서 "충정로→시청"처럼
// 폐색 구간 한 정거장만 탄 기록도 start=0으로 계산되어 순환 구간 전체를 탄 것처럼 잡힐 수 있다.
// 실사용 빈도가 낮아 당장 고치진 않았지만, 순환선을 새로 추가할 때 같은 문제가 재현될 수 있다.
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

    // 지역 필터를 여객열차 표시에도 똑같이 적용한다. (동명이역 자체는 이제 데이터에서
    // "판교(서천)"처럼 구분 표기해 이름이 겹치지 않으므로, 여기서는 지역만 확인하면 된다.)
    const currentStRegions = getStationRegions(currentLine, stIdx);
    const passengerEntries = (PASSENGER_STATION_ENTRIES[st] || []).filter((p) => {
      if (p.lineId === currentLine.id) return true;
      const otherLine = ALL_LINES.find((x) => x.id === p.lineId);
      const otherRegions = getStationRegions(otherLine, p.stationIdx);
      if (currentStRegions.length > 0 && otherRegions.length > 0 && !currentStRegions.some((r) => otherRegions.includes(r))) {
        return false;
      }
      return true;
    });
    const hasPassenger = passengerEntries.length > 0;
    const passengerLines = hasPassenger
      ? Array.from(new Set(passengerEntries.map((p) => p.lineName))).sort()
      : [];

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

// 이름만 우연히 같을 뿐 실제로는 다른 위치에 있는 역 쌍(순수 동명이역)은 예전에는 예외 목록으로
// 걸러냈지만, 그 방식은 "환승 배지"만 가려줄 뿐 방문 기록(visited)이나 구간 기록(trips)처럼
// 역 이름을 그대로 키로 쓰는 다른 모든 곳까지는 못 막아서 예를 들어 신분당선 판교(성남)를
// 방문 체크하면 장항선 판교(서천)도 같이 방문 처리되는 문제가 있었다. 지금은 데이터
// 자체에서 "판교(서천)"처럼 두 역을 아예 다른 문자열로 구분해 저장해 근본적으로 막는다
// (아래 DISPLAY_NAME_OVERRIDES가 화면에는 원래 역명만 보이도록 해준다).

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
