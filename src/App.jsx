import { useState, useMemo } from "react";
import {
  ALL_LINES,
  ALL_STATION_NAMES,
  SERVICE_NETWORKS,
  computeLineStats,
  computePhysicalLineStats,
  deriveServiceCoverage,
  derivedPhysicalSegments,
  computePhysicalRegistry,
  getPhysicalStations,
  getPhysicalLineList,
  getStationStyles,
  getTransferInfo,
  getUnderlyingPhysicalIds,
  splitTripBySegments,
  displayColor,
  hasOfficialColor,
} from "./utils/railData";
import { useProgress } from "./hooks/useProgress";
import Lobby from "./components/Lobby";
import LineBrowser from "./components/LineBrowser";
import ProgressPage from "./components/ProgressPage";
import LineDiagram from "./components/LineDiagram";
import TripForm from "./components/TripForm";
import TripList from "./components/TripList";

export default function App() {
  const { visited, trips, startDate, loaded, toggleStation, addTrip, deleteTrip, resetAll } = useProgress();
  const [view, setView] = useState("lobby"); // lobby | physical | service | progress | detail
  const [returnView, setReturnView] = useState("lobby");
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const physicalLineList = useMemo(() => getPhysicalLineList(), []);

  const selectedLine =
    ALL_LINES.find((l) => l.id === selectedLineId) || physicalLineList.find((l) => l.id === selectedLineId) || null;

  const overallStats = useMemo(() => {
    const totalStations = ALL_STATION_NAMES.length;
    const visitedCount = ALL_STATION_NAMES.filter((s) => visited.has(s)).length;
    const registry = computePhysicalRegistry();
    let totalSeg = 0;
    let riddenSeg = 0;
    registry.forEach((stations, physicalId) => {
      totalSeg += stations.length - 1;
      riddenSeg += derivedPhysicalSegments(stations, trips[physicalId]).size;
    });
    return { totalStations, visitedCount, totalSeg, riddenSeg };
  }, [visited, trips]);

  const physicalStats = useMemo(() => computePhysicalLineStats(trips), [trips]);

  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-500 text-sm">불러오는 중...</div>;
  }

  const goLobby = () => {
    setView("lobby");
    setSelectedLineId(null);
  };

  const enterMode = (mode) => setView(mode);

  const selectLine = (id) => {
    setReturnView(view === "detail" ? returnView : view);
    setSelectedLineId(id);
    setView("detail");
  };

  const backFromDetail = () => {
    setSelectedLineId(null);
    setView(returnView === "detail" ? "lobby" : returnView);
  };

  if (view === "lobby") {
    return <Lobby overallStats={overallStats} startDate={startDate} onEnter={enterMode} />;
  }

  if (view === "progress") {
    return (
      <ProgressPage overallStats={overallStats} physicalStats={physicalStats} onBack={goLobby} onSelectLine={selectLine} />
    );
  }

  if (view === "physical") {
    return (
      <LineBrowser
        title="🛤️ 노선으로 찾기"
        subtitle="실제 선로 기준 전체 구간이에요. KTX·무궁화호 등 여객열차로 탄 구간은 여기서 기록하세요."
        flatLines={physicalLineList}
        visited={visited}
        trips={trips}
        onSelectLine={selectLine}
        onBack={goLobby}
      />
    );
  }

  if (view === "service") {
    return (
      <LineBrowser
        title="🚇 운행계통으로 찾기"
        subtitle="1호선, 2호선, 대경선처럼 실제 도시철도·광역전철 운행계통 기준이에요. (여객열차 제외)"
        groups={SERVICE_NETWORKS}
        visited={visited}
        trips={trips}
        onSelectLine={selectLine}
        onBack={goLobby}
      />
    );
  }

  // view === "detail"
  if (!selectedLine) {
    goLobby();
    return null;
  }

  const underlyingIds = getUnderlyingPhysicalIds(selectedLine);
  const physicalStations = getPhysicalStations(selectedLine);
  const lineTrips = underlyingIds.flatMap((pid) =>
    (trips[pid] || []).map((t) => ({ ...t, _pid: pid, _pidName: ALL_LINES.find((l) => l.id === pid)?.name || pid }))
  );
  const covered = deriveServiceCoverage(selectedLine, trips);
  const sharingLines = ALL_LINES.filter((l) => {
    if (l.id === selectedLine.id) return false;
    const otherIds = getUnderlyingPhysicalIds(l);
    return otherIds.some((id) => underlyingIds.includes(id));
  });
  const isShared = sharingLines.length > 0;
  const st = computeLineStats(selectedLine, visited, trips);
  const transferInfo = getTransferInfo(selectedLine);
  const stationStyles = getStationStyles(selectedLine, transferInfo);
  const isMixedColor = selectedLine.kind === "physical" && stationStyles.some((s) => s.colored);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <button onClick={backFromDetail} className="text-xs text-neutral-400 hover:text-neutral-700">
            ← 목록으로
          </button>
          <div className="flex items-center gap-2">
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)} className="text-xs text-neutral-400 hover:text-red-500 px-2 py-1.5">
                전체 기록 초기화
              </button>
            ) : (
              <span className="text-xs flex items-center gap-1">
                정말 삭제할까요?
                <button
                  onClick={() => {
                    resetAll();
                    setConfirmReset(false);
                  }}
                  className="text-red-500 font-semibold px-1"
                >
                  예
                </button>
                <button onClick={() => setConfirmReset(false)} className="text-neutral-400 px-1">
                  아니오
                </button>
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-block w-3 h-3 ${hasOfficialColor(selectedLine) ? "rounded-full" : "rounded-[2px]"}`}
            style={{ backgroundColor: displayColor(selectedLine) }}
          />
          <h2 className="font-bold text-base">{selectedLine.name}</h2>
          {selectedLine.note && <span className="text-xs text-neutral-400">{selectedLine.note}</span>}
          {!hasOfficialColor(selectedLine) && (
            <span className="text-[10px] text-neutral-400 border border-neutral-300 rounded-full px-2 py-0.5">공식 노선색 없음</span>
          )}
        </div>

        {isShared && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            이 노선은 다른 노선과 같은 선로를 공유해요. 구간 기록은{" "}
            {sharingLines.length > 0 ? sharingLines.map((l) => l.name).join(", ") + "와(과) " : ""}
            자동으로 공유돼요. 예: 무궁화호로 탄 구간도 여기 반영됩니다.
          </p>
        )}

        <div className="flex gap-4 text-xs text-neutral-600">
          <span>
            역 방문 {st.visitedStations}/{st.totalStations}
          </span>
          <span>
            구간 완주 {st.riddenSegments}/{st.totalSegments}
          </span>
        </div>

        <LineDiagram
          line={selectedLine}
          visited={visited}
          covered={covered}
          onToggleStation={toggleStation}
          stationStyles={stationStyles}
          transferInfo={transferInfo}
        />
        <div className="flex gap-3 text-xs text-neutral-500 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-neutral-400 bg-neutral-400" /> 방문한 역 (원: 도시철도 운행계통 있음)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 border-2 border-neutral-400 bg-white" /> 미방문 역 (네모: 여객열차만 운행)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-1 rounded bg-neutral-400" /> 기록으로 완주된 구간
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-neutral-400" /> 전철 환승역
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rotate-45 bg-[#9A3412]" /> 여객열차(KTX·SRT·무궁화 등) 접근 가능
          </span>
          {isMixedColor && (
            <span className="text-neutral-400">
              · 역 색은 그 역을 지나는 도시철도 운행계통 색을 따르고, 운행계통이 없는 구간은 검정 네모예요.
            </span>
          )}
        </div>

        <div className="pt-2">
          <h3 className="text-sm font-semibold mb-2">구간 기록 추가</h3>
          <TripForm
            stations={physicalStations}
            onAdd={(from, to, date, note, via) => {
              const parts = splitTripBySegments(selectedLine, from, to);
              parts.forEach((p) => addTrip(p.physicalLineId, p.from, p.to, date, note, via));
            }}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">
            기록된 구간 <span className="text-neutral-400 font-normal">({lineTrips.length}건)</span>
          </h3>
          <TripList physicalStations={physicalStations} lineTrips={lineTrips} onDelete={(trip) => deleteTrip(trip._pid, trip.id)} />
        </div>
      </div>

      <footer className="max-w-3xl mx-auto px-5 pb-8 pt-2 text-[11px] text-neutral-400 leading-relaxed">
        구간 완주는 노선별로 입력한 출발역·도착역·날짜 기록으로부터 자동 계산돼요. 같은 선로를 공유하는 노선(예: 1호선 경부선 구간과 경부선
        전체)은 기록이 자동으로 공유됩니다. 4호선·3호선·5호선처럼 여러 노선(진접선·과천선·안산선 등)에 걸친 운행계통은 구간 기록 시 자동으로
        해당 노선별로 나눠 저장돼요. 역 방문 여부는 별도로 동그라미를 눌러 기록해요. 모든 기록은 이 브라우저(localStorage)에만 저장돼요.
      </footer>
    </div>
  );
}
