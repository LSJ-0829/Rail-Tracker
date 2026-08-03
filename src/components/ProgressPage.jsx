import { displayColor, hasOfficialColor } from "../utils/railData";

export default function ProgressPage({ overallStats, physicalStats, onBack, onSelectLine }) {
  const pct = overallStats.totalSeg ? Math.round((overallStats.riddenSeg / overallStats.totalSeg) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      <button onClick={onBack} className="text-xs text-neutral-400 hover:text-neutral-700 mb-4">
        ← 로비로
      </button>
      <h1 className="text-lg font-bold mb-1">📊 완주 현황</h1>
      <p className="text-xs text-neutral-500 mb-6">전국 노선 기준으로 계산해요 (같은 선로를 공유하는 운행계통은 중복 집계하지 않아요).</p>

      <div className="bg-neutral-900 text-white rounded-2xl p-6 mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs text-neutral-300 mb-1">전체 구간 완주율</div>
          <div className="text-3xl font-extrabold">{pct}%</div>
          <div className="text-xs text-neutral-400 mt-1">
            {overallStats.riddenSeg} / {overallStats.totalSeg} 구간
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-neutral-300 mb-1">역 방문</div>
          <div className="text-xl font-bold">
            {overallStats.visitedCount} / {overallStats.totalStations}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold mb-3">노선별 완주율</h2>
      <div className="space-y-2">
        {physicalStats.map((line) => (
          <button
            key={line.id}
            onClick={() => onSelectLine(line.id)}
            className="w-full text-left bg-white border border-neutral-200 rounded-xl px-4 py-3 hover:border-neutral-400 transition"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-block w-2.5 h-2.5 shrink-0 ${hasOfficialColor(line) ? "rounded-full" : "rounded-[2px]"}`}
                style={{ backgroundColor: displayColor(line) }}
              />
              <span className="text-sm font-medium flex-1 truncate">
                {line.name}
                {line.note && <span className="text-neutral-400 font-normal"> · {line.note}</span>}
              </span>
              <span className="text-sm font-bold shrink-0">{line.pct}%</span>
            </div>
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${line.pct}%`, backgroundColor: displayColor(line) }}
              />
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">
              {line.riddenSegments} / {line.totalSegments} 구간
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
