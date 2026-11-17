import { displayColor } from "../utils/railData";
import { Chevron, formatPct } from "./Lobby";
import { LineSwatch } from "./LineBrowser";

export default function ProgressPage({ overallStats, physicalStats, onSelectLine }) {
  const pct = overallStats.totalSeg ? (overallStats.riddenSeg / overallStats.totalSeg) * 100 : 0;
  const started = physicalStats.filter((l) => l.riddenSegments > 0).length;
  const completed = physicalStats.filter((l) => l.totalSegments > 0 && l.riddenSegments === l.totalSegments).length;

  return (
    <main>
      <section className="bg-black text-white text-center px-5 pt-14 pb-16 sm:pt-20 sm:pb-20">
        <p className="text-[17px] sm:text-[21px] font-semibold text-[#86868b] mb-3">완주 현황</p>
        <div className="font-semibold tracking-tightest text-[80px] sm:text-[128px] leading-none mb-4">{formatPct(pct)}%</div>
        <p className="text-[17px] sm:text-[19px] text-white/80 max-w-lg mx-auto leading-snug">
          전국 노선 기준으로 계산해요. 같은 선로를 공유하는 운행계통은 중복 집계하지 않아요.
        </p>
        <div className="max-w-md mx-auto h-1.5 rounded-full bg-white/15 overflow-hidden mt-8">
          <div className="h-full rounded-full bg-gradient-to-r from-[#2997ff] to-[#a259ff]" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      </section>

      <section className="max-w-[980px] mx-auto px-3 sm:px-6 -mt-0 py-3 sm:py-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="완주 구간" value={overallStats.riddenSeg} total={overallStats.totalSeg} />
        <Stat label="방문한 역" value={overallStats.visitedCount} total={overallStats.totalStations} />
        <Stat label="타 본 노선" value={started} total={physicalStats.length} />
        <Stat label="완주한 노선" value={completed} total={physicalStats.length} />
      </section>

      <section className="max-w-[720px] mx-auto px-4 sm:px-6 pt-8 pb-16">
        <h2 className="headline text-[28px] sm:text-[32px] mb-4 px-1">노선별 완주율</h2>
        <div className="grouped">
          {physicalStats.map((line) => (
            <button
              key={line.id}
              onClick={() => onSelectLine(line.id)}
              className="w-full text-left px-4 sm:px-5 py-3.5 transition hover:bg-[#fafafc] active:bg-[#f0f0f3]"
            >
              <div className="flex items-center gap-3.5">
                <LineSwatch line={line} />
                <span className="flex-1 min-w-0 text-[17px] text-ink truncate">{line.name}</span>
                <span className={`text-[17px] tabular-nums shrink-0 ${line.pct > 0 ? "text-ink font-medium" : "text-sub"}`}>{line.pct}%</span>
                <Chevron className="text-[#c7c7cc] ml-0.5" />
              </div>
              <div className="flex items-center gap-3 mt-2 pl-[26px] pr-5">
                <div className="flex-1 h-1 bg-[#e8e8ed] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${line.pct}%`, backgroundColor: displayColor(line) }} />
                </div>
                <span className="text-[12px] text-sub tabular-nums shrink-0">
                  {line.riddenSegments}/{line.totalSegments}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, total }) {
  return (
    <div className="card px-5 py-6 text-center">
      <div className="text-[13px] text-sub mb-1">{label}</div>
      <div className="font-semibold tracking-tight text-[28px] sm:text-[32px] leading-tight tabular-nums">{value.toLocaleString()}</div>
      <div className="text-[13px] text-sub tabular-nums">/ {total.toLocaleString()}</div>
    </div>
  );
}
