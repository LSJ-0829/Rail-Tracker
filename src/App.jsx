import { useState, useMemo, useEffect } from "react";
import {
  ALL_LINES,
  ALL_STATION_NAMES,
  SERVICE_NETWORKS,
  computeLineStats,
  computePhysicalLineStats,
  deriveRiddenEdges,
  derivedPhysicalSegments,
  computePhysicalRegistry,
  getPhysicalStations,
  getPhysicalLineList,
  getStationStyles,
  getTransferInfo,
  getUnderlyingPhysicalIds,
  splitTripBySegments,
  hasOfficialColor,
} from "./utils/railData";
import { useProgress } from "./hooks/useProgress";
import NavBar from "./components/NavBar";
import Lobby from "./components/Lobby";
import LineBrowser, { LineSwatch } from "./components/LineBrowser";
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

  // 화면이 바뀌면 맨 위에서 시작
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, selectedLineId]);

  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center text-sub text-[15px]">불러오는 중...</div>;
  }

  const navigate = (next) => {
    setSelectedLineId(null);
    setConfirmReset(false);
    setView(next);
  };

  const selectLine = (id) => {
    setReturnView(view === "detail" ? returnView : view);
    setSelectedLineId(id);
    setView("detail");
  };

  const backFromDetail = () => {
    setSelectedLineId(null);
    setConfirmReset(false);
    setView(returnView === "detail" ? "lobby" : returnView);
  };

  let page;
  if (view === "lobby") {
    page = <Lobby overallStats={overallStats} startDate={startDate} onEnter={navigate} />;
  } else if (view === "progress") {
    page = <ProgressPage overallStats={overallStats} physicalStats={physicalStats} onSelectLine={selectLine} />;
  } else if (view === "physical") {
    page = (
      <LineBrowser
        title="노선"
        subtitle="실제 선로 기준 전체 구간이에요. KTX·무궁화호 등 여객열차로 탄 구간은 여기서 기록하세요."
        flatLines={physicalLineList}
        visited={visited}
        trips={trips}
        onSelectLine={selectLine}
      />
    );
  } else if (view === "service") {
    page = (
      <LineBrowser
        title="운행계통"
        subtitle="1호선, 2호선, 대경선처럼 도시철도·광역전철 운행계통 기준이에요. 여객열차는 노선에서 기록해요."
        groups={SERVICE_NETWORKS}
        visited={visited}
        trips={trips}
        onSelectLine={selectLine}
      />
    );
  } else if (!selectedLine) {
    page = null;
  } else {
    page = (
      <LineDetail
        line={selectedLine}
        visited={visited}
        trips={trips}
        toggleStation={toggleStation}
        addTrip={addTrip}
        deleteTrip={deleteTrip}
        resetAll={resetAll}
        confirmReset={confirmReset}
        setConfirmReset={setConfirmReset}
        onBack={backFromDetail}
        backLabel={returnView === "progress" ? "완주 현황" : returnView === "service" ? "운행계통" : "노선"}
      />
    );
  }

  if (view === "detail" && !selectedLine) {
    // 선택한 노선을 찾을 수 없으면 첫 화면으로
    setTimeout(() => navigate("lobby"), 0);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <NavBar current={view === "detail" ? returnView : view} onNavigate={navigate} />
      {page}
    </div>
  );
}

function LineDetail({
  line,
  visited,
  trips,
  toggleStation,
  addTrip,
  deleteTrip,
  resetAll,
  confirmReset,
  setConfirmReset,
  onBack,
  backLabel,
}) {
  const underlyingIds = getUnderlyingPhysicalIds(line);
  const physicalStations = getPhysicalStations(line);
  // 각 기록의 역 구간 수는 그 기록이 실제로 속한 물리 노선(_pid)의 역 목록 기준으로 세야 한다.
  // 예: "1호선 경부·장항선 계통"과 "대경선"은 경부선을 공유하므로, 대경선에서 기록한 구미↔경산
  // 구간도 1호선 쪽 화면에 같이 뜨는데, 이때 1호선의 역 목록에는 구미·경산이 아예 없어서
  // indexOf가 둘 다 -1이 되어 "(1개 역 구간)"처럼 엉뚱한 값이 나오던 버그가 있었다.
  const lineTrips = underlyingIds.flatMap((pid) => {
    const pidLine = ALL_LINES.find((l) => l.id === pid);
    return (trips[pid] || []).map((t) => ({
      ...t,
      _pid: pid,
      _pidName: pidLine?.name || pid,
      _pidStations: getPhysicalStations(pidLine),
    }));
  });
  const riddenEdges = deriveRiddenEdges(line, trips);
  const sharingLines = ALL_LINES.filter((l) => {
    if (l.id === line.id) return false;
    return getUnderlyingPhysicalIds(l).some((id) => underlyingIds.includes(id));
  });
  const st = computeLineStats(line, visited, trips);
  const pct = st.totalSegments ? Math.round((st.riddenSegments / st.totalSegments) * 100) : 0;
  const transferInfo = getTransferInfo(line);
  const stationStyles = getStationStyles(line, transferInfo);
  const isMixedColor = line.kind === "physical" && stationStyles.some((s) => s.colored);

  return (
    <main className="max-w-[980px] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-16">
      <button onClick={onBack} className="text-[15px] text-link mb-6 inline-flex items-center gap-1">
        <svg width="8" height="13" viewBox="0 0 8 13" fill="none" aria-hidden>
          <path d="M6.5 1.5L1.5 6.5L6.5 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {backLabel}
      </button>

      <div className="flex items-center gap-3 mb-2">
        <LineSwatch line={line} size={16} />
        <h1 className="headline text-[34px] sm:text-[48px] leading-tight">{line.name}</h1>
      </div>
      {line.note && <p className="text-[15px] text-sub leading-relaxed max-w-[720px] mb-1">{line.note}</p>}
      {!hasOfficialColor(line) && <p className="text-[13px] text-sub">공식 노선색 없음</p>}

      <div className="grid grid-cols-3 gap-3 mt-7 mb-3">
        <DetailStat label="구간 완주" value={`${pct}%`} />
        <DetailStat label="완주 구간" value={`${st.riddenSegments}/${st.totalSegments}`} />
        <DetailStat label="방문한 역" value={`${st.visitedStations}/${st.totalStations}`} />
      </div>

      {sharingLines.length > 0 && (
        <p className="card px-5 py-4 text-[15px] text-ink/80 leading-relaxed mb-3">
          이 노선은 {sharingLines.map((l) => l.name).join(", ")}와(과) 같은 선로를 써서 구간 기록이 자동으로 공유돼요. 예를 들어
          무궁화호로 탄 구간도 여기에 반영돼요.
        </p>
      )}

      <LineDiagram
        line={line}
        visited={visited}
        riddenEdges={riddenEdges}
        onToggleStation={toggleStation}
        stationStyles={stationStyles}
        transferInfo={transferInfo}
      />
      <div className="flex gap-x-5 gap-y-2 text-[12px] text-sub flex-wrap px-1 mt-3 mb-12">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-[#86868b]" /> 방문한 역 (원: 도시철도 운행계통 있음)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 border-2 border-[#86868b] bg-white" /> 미방문 역 (네모: 여객열차만 운행)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-1 rounded bg-[#86868b]" /> 완주한 구간
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-[#86868b]" /> 전철 환승역
        </span>
        {line.kind !== "physical" && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rotate-45 bg-[#9A3412]" /> 여객열차(KTX·SRT·무궁화 등) 환승 가능
          </span>
        )}
        {isMixedColor && <span>역 색은 그 역을 지나는 도시철도 운행계통 색이고, 운행계통이 없는 구간은 검정 네모예요.</span>}
        <span>역을 누르면 방문 표시가 바뀌어요.</span>
      </div>

      <section className="max-w-[720px] mb-12">
        <h2 className="headline text-[28px] mb-4 px-1">구간 기록 추가</h2>
        <TripForm
          stations={physicalStations}
          onAdd={(from, to, date, note, via) => {
            const parts = splitTripBySegments(line, from, to);
            parts.forEach((p) => addTrip(p.physicalLineId, p.from, p.to, date, note, via));
          }}
        />
      </section>

      <section className="max-w-[720px] mb-14">
        <h2 className="headline text-[28px] mb-4 px-1">
          기록된 구간 <span className="text-sub font-normal">{lineTrips.length}</span>
        </h2>
        <TripList physicalStations={physicalStations} lineTrips={lineTrips} onDelete={(trip) => deleteTrip(trip._pid, trip.id)} />
      </section>

      <footer className="max-w-[720px] border-t border-hair pt-5 text-[12px] text-sub leading-relaxed space-y-3">
        <p>
          구간 완주는 노선별로 입력한 출발역·도착역·날짜 기록으로 자동 계산돼요. 같은 선로를 쓰는 노선(예: 1호선 경부선 구간과 경부선)은
          기록이 자동으로 공유되고, 4호선·3호선·5호선처럼 여러 노선에 걸친 운행계통은 기록할 때 노선별로 나눠 저장돼요. 모든 기록은 이
          브라우저에만 저장돼요.
        </p>
        <p>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} className="text-link">
              전체 기록 초기화…
            </button>
          ) : (
            <span className="inline-flex items-center gap-3 flex-wrap">
              <span className="text-ink">모든 노선의 기록을 지울까요? 되돌릴 수 없어요.</span>
              <button
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                }}
                className="text-[#e30000] font-medium"
              >
                모두 지우기
              </button>
              <button onClick={() => setConfirmReset(false)} className="text-link">
                취소
              </button>
            </span>
          )}
        </p>
      </footer>
    </main>
  );
}

function DetailStat({ label, value }) {
  return (
    <div className="card px-4 py-5 text-center">
      <div className="text-[12px] sm:text-[13px] text-sub mb-1">{label}</div>
      <div className="font-semibold tracking-tight text-[22px] sm:text-[28px] leading-tight tabular-nums">{value}</div>
    </div>
  );
}
