import { useState, useMemo } from "react";
import { computeLineStats, displayColor, hasOfficialColor } from "../utils/railData";

/**
 * 물리노선 모드: flatLines (그룹 없음)
 * 서비스 모드: groups ([{id,name,lines}]) - 지역별로 묶어서 보여줌
 */
export default function LineBrowser({ title, subtitle, flatLines, groups, visited, trips, onSelectLine, onBack }) {
  const [query, setQuery] = useState("");

  const filteredFlat = useMemo(() => {
    if (!flatLines) return null;
    if (!query.trim()) return flatLines;
    return flatLines.filter((l) => l.name.includes(query.trim()) || l.stations.some((s) => s.includes(query.trim())));
  }, [flatLines, query]);

  const filteredGroups = useMemo(() => {
    if (!groups) return null;
    if (!query.trim()) return groups;
    return groups
      .map((g) => ({
        ...g,
        lines: g.lines.filter((l) => l.name.includes(query.trim()) || l.stations.some((s) => s.includes(query.trim()))),
      }))
      .filter((g) => g.lines.length > 0);
  }, [groups, query]);

  const LineCard = ({ line }) => {
    const st = computeLineStats(line, visited, trips);
    const pct = st.totalSegments ? Math.round((st.riddenSegments / st.totalSegments) * 100) : 0;
    return (
      <button
        onClick={() => onSelectLine(line.id)}
        className="w-full text-left bg-white border border-neutral-200 rounded-xl px-4 py-3 hover:border-neutral-400 transition flex items-center gap-3"
      >
        <span
          className={`inline-block w-3 h-3 shrink-0 ${hasOfficialColor(line) ? "rounded-full" : "rounded-[2px]"}`}
          style={{ backgroundColor: displayColor(line) }}
        />
        <span className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{line.name}</div>
          <div className="text-[11px] text-neutral-400 truncate">
            {line.note ? line.note + " · " : ""}
            {line.stations.length}개 역
          </div>
        </span>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold">{pct}%</div>
          <div className="text-[10px] text-neutral-400">완주</div>
        </div>
      </button>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      <button onClick={onBack} className="text-xs text-neutral-400 hover:text-neutral-700 mb-4">
        ← 로비로
      </button>
      <h1 className="text-lg font-bold mb-1">{title}</h1>
      {subtitle && <p className="text-xs text-neutral-500 mb-4">{subtitle}</p>}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="노선 이름 또는 역 이름으로 검색"
        className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 mb-5 focus:outline-none focus:ring-2 focus:ring-neutral-400"
      />

      {filteredFlat && (
        <div className="space-y-2">
          {filteredFlat.map((l) => (
            <LineCard key={l.id} line={l} />
          ))}
          {filteredFlat.length === 0 && <p className="text-sm text-neutral-400 text-center py-8">일치하는 노선이 없어요.</p>}
        </div>
      )}

      {filteredGroups && (
        <div className="space-y-6">
          {filteredGroups.map((g) => (
            <div key={g.id}>
              <h3 className="text-xs font-semibold text-neutral-500 mb-2">{g.name}</h3>
              <div className="space-y-2">
                {g.lines.map((l) => (
                  <LineCard key={l.id} line={l} />
                ))}
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && <p className="text-sm text-neutral-400 text-center py-8">일치하는 노선이 없어요.</p>}
        </div>
      )}
    </div>
  );
}
