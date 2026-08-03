import { lock } from "../utils/auth";

function formatStartDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return `${y}년 ${m}월 ${d}일`;
}

export default function Lobby({ overallStats, startDate, onEnter }) {
  const pct = overallStats.totalSeg ? Math.round((overallStats.riddenSeg / overallStats.totalSeg) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto px-5 py-14">
      <h1 className="text-2xl font-bold tracking-tight text-center mb-2">🚈 국내 철도 완주 기록</h1>
      <p className="text-sm text-neutral-500 text-center mb-1">
        어떤 방식으로 노선을 찾아볼까요?
      </p>
      {formatStartDate(startDate) && (
        <p className="text-[11px] text-neutral-400 text-center mb-10">
          {formatStartDate(startDate)}부터 기록 중
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <button
          onClick={() => onEnter("physical")}
          className="text-left bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-400 hover:shadow-sm transition"
        >
          <div className="text-2xl mb-2">🛤️</div>
          <h2 className="font-bold mb-1">노선으로 찾기</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            경부선, 호남선처럼 실제 선로 기준 전체 구간을 봅니다. KTX·무궁화호 등 여객열차로 탄 구간도
            여기서 기록해요.
          </p>
        </button>

        <button
          onClick={() => onEnter("service")}
          className="text-left bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-400 hover:shadow-sm transition"
        >
          <div className="text-2xl mb-2">🚇</div>
          <h2 className="font-bold mb-1">운행계통으로 찾기</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            1호선, 2호선, 대경선처럼 실제 도시철도·광역전철 운행계통 기준으로 봅니다. (여객열차 제외)
          </p>
        </button>
      </div>

      <button
        onClick={() => onEnter("progress")}
        className="w-full text-left bg-neutral-900 text-white rounded-2xl p-6 hover:bg-neutral-800 transition flex items-center justify-between gap-4"
      >
        <div>
          <h2 className="font-bold mb-1">📊 완주 현황 보기</h2>
          <p className="text-xs text-neutral-300">
            전국 노선 기준으로 몇 %를 완주했는지 확인해요.
          </p>
        </div>
        <div className="text-3xl font-extrabold shrink-0">{pct}%</div>
      </button>

      <p className="text-[11px] text-neutral-400 text-center mt-8 leading-relaxed">
        역 {overallStats.visitedCount} / {overallStats.totalStations} 방문 · 구간 {overallStats.riddenSeg} / {overallStats.totalSeg} 완주
      </p>

      <p className="text-center mt-3">
        <button
          onClick={() => {
            lock();
            window.location.reload();
          }}
          className="text-[11px] text-neutral-300 hover:text-neutral-500 transition"
        >
          🔒 잠그기
        </button>
      </p>
    </div>
  );
}
