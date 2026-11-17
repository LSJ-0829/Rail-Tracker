import { useState, useMemo } from "react";
import { computeLineStats, displayColor, hasOfficialColor } from "../utils/railData";
import { Chevron } from "./Lobby";

export function LineSwatch({ line, size = 12 }) {
  return (
    <span
      className={`inline-block shrink-0 ${hasOfficialColor(line) ? "rounded-full" : "rounded-[3px]"}`}
      style={{ width: size, height: size, backgroundColor: displayColor(line) }}
    />
  );
}

function LineRow({ line, visited, trips, onSelectLine }) {
  const st = computeLineStats(line, visited, trips);
  const pct = st.totalSegments ? Math.round((st.riddenSegments / st.totalSegments) * 100) : 0;
  return (
    <button
      onClick={() => onSelectLine(line.id)}
      className="w-full text-left px-4 sm:px-5 py-3.5 flex items-center gap-3.5 transition hover:bg-[#fafafc] active:bg-[#f0f0f3]"
    >
      <LineSwatch line={line} />
      <span className="flex-1 min-w-0">
        <span className="block text-[17px] text-ink truncate">{line.name}</span>
        <span className="block text-[13px] text-sub truncate">{line.stations.length}개 역</span>
      </span>
      <span className={`text-[17px] tabular-nums shrink-0 ${pct > 0 ? "text-ink font-medium" : "text-sub"}`}>{pct}%</span>
      <Chevron className="text-[#c7c7cc] ml-0.5" />
    </button>
  );
}

/**
 * 물리노선 모드: flatLines (그룹 없음)
 * 서비스 모드: groups ([{id,name,lines}]) - 지역별로 묶어서 보여줌
 */
export default function LineBrowser({ title, subtitle, flatLines, groups, visited, trips, onSelectLine }) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const match = (l) => l.name.includes(q) || l.stations.some((s) => s.includes(q));

  const filteredFlat = useMemo(() => {
    if (!flatLines) return null;
    return q ? flatLines.filter(match) : flatLines;
  }, [flatLines, q]);

  const filteredGroups = useMemo(() => {
    if (!groups) return null;
    if (!q) return groups;
    return groups.map((g) => ({ ...g, lines: g.lines.filter(match) })).filter((g) => g.lines.length > 0);
  }, [groups, q]);

  const empty = (filteredFlat && filteredFlat.length === 0) || (filteredGroups && filteredGroups.length === 0);

  return (
    <main className="max-w-[720px] mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16">
      <h1 className="headline text-[34px] sm:text-[48px] leading-tight mb-2">{title}</h1>
      {subtitle && <p className="text-[17px] text-sub leading-snug mb-7">{subtitle}</p>}

      <div className="relative mb-8">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="노선 이름 또는 역 이름"
          className="field !bg-[#e8e8ed] focus:!bg-white pl-10"
        />
      </div>

      {filteredFlat && filteredFlat.length > 0 && (
        <div className="grouped">
          {filteredFlat.map((l) => (
            <LineRow key={l.id} line={l} visited={visited} trips={trips} onSelectLine={onSelectLine} />
          ))}
        </div>
      )}

      {filteredGroups && (
        <div className="space-y-9">
          {filteredGroups.map((g) => (
            <section key={g.id}>
              <h2 className="text-[22px] font-semibold tracking-tight text-ink mb-3 px-1">{g.name}</h2>
              <div className="grouped">
                {g.lines.map((l) => (
                  <LineRow key={l.id} line={l} visited={visited} trips={trips} onSelectLine={onSelectLine} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {empty && <p className="text-[17px] text-sub text-center py-16">일치하는 노선이 없어요.</p>}
    </main>
  );
}
