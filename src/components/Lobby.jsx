function formatStartDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return `${y}년 ${m}월 ${d}일`;
}

export function Chevron({ className = "" }) {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13" fill="none" className={`inline-block ml-1 -mt-px ${className}`} aria-hidden>
      <path d="M1.5 1.5L6.5 6.5L1.5 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function formatPct(pct) {
  return pct > 0 && pct < 1 ? pct.toFixed(1) : String(Math.round(pct));
}

export default function Lobby({ overallStats, startDate, onEnter }) {
  const pct = overallStats.totalSeg ? (overallStats.riddenSeg / overallStats.totalSeg) * 100 : 0;
  const pctText = formatPct(pct);
  const since = formatStartDate(startDate);

  return (
    <main>
      {/* 히어로 */}
      <section className="bg-white text-center px-5 pt-16 pb-14 sm:pt-24 sm:pb-20">
        <p className="text-[17px] sm:text-[21px] font-semibold text-sub mb-2">국내 철도 완주 기록</p>
        <h1 className="headline text-[44px] leading-[1.08] sm:text-[72px] sm:leading-[1.05] mb-4">
          전국의 선로,
          <br />
          한 구간씩.
        </h1>
        <p className="text-[19px] sm:text-[24px] leading-snug text-ink/80 mb-8">
          지금까지{" "}
          <span className="font-semibold bg-gradient-to-r from-[#0071e3] via-[#7b2ff7] to-[#e3006d] bg-clip-text text-transparent">
            {pctText}%
          </span>{" "}
          완주했어요.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button onClick={() => onEnter("physical")} className="btn-primary">
            구간 기록하기
          </button>
          <button onClick={() => onEnter("progress")} className="btn-secondary">
            완주 현황 보기
          </button>
        </div>
        {since && <p className="text-[12px] text-sub mt-8">{since}부터 기록 중</p>}
      </section>

      {/* 찾아보기 타일 */}
      <section className="max-w-[980px] mx-auto px-3 sm:px-6 py-3 sm:py-6 grid sm:grid-cols-2 gap-3">
        <button
          onClick={() => onEnter("physical")}
          className="card text-center px-8 pt-12 pb-10 min-h-[320px] flex flex-col items-center transition hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        >
          <h2 className="headline text-[32px] sm:text-[40px] leading-tight mb-2">노선</h2>
          <p className="text-[17px] text-ink/80 leading-snug mb-4 max-w-xs">
            경부선, 호남선처럼
            <br />
            실제 선로 기준 전체 구간.
          </p>
          <span className="text-[17px] text-link">
            노선으로 찾기
            <Chevron />
          </span>
          <TrackGlyph />
        </button>

        <button
          onClick={() => onEnter("service")}
          className="card text-center px-8 pt-12 pb-10 min-h-[320px] flex flex-col items-center transition hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        >
          <h2 className="headline text-[32px] sm:text-[40px] leading-tight mb-2">운행계통</h2>
          <p className="text-[17px] text-ink/80 leading-snug mb-4 max-w-xs">
            1호선, 2호선, 대경선처럼
            <br />
            도시철도·광역전철 기준.
          </p>
          <span className="text-[17px] text-link">
            운행계통으로 찾기
            <Chevron />
          </span>
          <MetroGlyph />
        </button>

        <button
          onClick={() => onEnter("progress")}
          className="sm:col-span-2 rounded-[22px] bg-black text-white text-center px-8 pt-12 pb-14 transition hover:bg-[#111]"
        >
          <p className="text-[17px] font-semibold text-[#86868b] mb-2">완주 현황</p>
          <div className="font-semibold tracking-tightest text-[64px] sm:text-[96px] leading-none mb-3">{pctText}%</div>
          <p className="text-[15px] sm:text-[17px] text-white/80 mb-6">
            역 {overallStats.visitedCount.toLocaleString()} / {overallStats.totalStations.toLocaleString()} 방문 · 구간{" "}
            {overallStats.riddenSeg.toLocaleString()} / {overallStats.totalSeg.toLocaleString()} 완주
          </p>
          <div className="max-w-md mx-auto h-1.5 rounded-full bg-white/15 overflow-hidden mb-6">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2997ff] to-[#a259ff]"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <span className="text-[17px] text-[#2997ff]">
            노선별로 보기
            <Chevron />
          </span>
        </button>
      </section>

      <footer className="max-w-[980px] mx-auto px-5 sm:px-6 pt-6 pb-12 text-[12px] leading-relaxed text-sub">
        모든 기록은 이 기기의 브라우저에만 저장돼요. 기기를 바꾸면 기록이 옮겨지지 않아요.
      </footer>
    </main>
  );
}

// 타일 하단 장식: 선로(침목) 그림
function TrackGlyph() {
  return (
    <svg viewBox="0 0 240 60" className="w-full max-w-[260px] mt-auto pt-8 text-ink" aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={6 + i * 20} y={18} width={6} height={24} rx={1.5} fill="currentColor" opacity={0.12} />
      ))}
      <rect x={0} y={22} width={240} height={3} rx={1.5} fill="currentColor" opacity={0.75} />
      <rect x={0} y={35} width={240} height={3} rx={1.5} fill="currentColor" opacity={0.75} />
    </svg>
  );
}

// 타일 하단 장식: 노선도 그림
function MetroGlyph() {
  const colors = ["#0052A4", "#00A84D", "#EF7C1C", "#00A5DE", "#996CAC"];
  return (
    <svg viewBox="0 0 240 60" className="w-full max-w-[260px] mt-auto pt-8" aria-hidden>
      <line x1={10} y1={30} x2={230} y2={30} stroke="#d2d2d7" strokeWidth={6} strokeLinecap="round" />
      {colors.map((c, i) => (
        <circle key={c} cx={22 + i * 49} cy={30} r={9} fill="#fff" stroke={c} strokeWidth={4} />
      ))}
    </svg>
  );
}
