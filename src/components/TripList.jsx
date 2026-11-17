import { useState } from "react";
import { displayStationName, getTripStationCount } from "../utils/railData";

function formatDate(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return `${y}. ${m}. ${day}.`;
}

export default function TripList({ physicalStations, lineTrips, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const sorted = [...(lineTrips || [])].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sorted.length === 0) {
    return <div className="card px-5 py-8 text-center text-[15px] text-sub">아직 기록된 구간이 없어요.</div>;
  }

  return (
    <div className="grouped">
      {sorted.map((t) => {
        // 기록이 지금 보고 있는 노선과 다른 물리 노선(_pid)에 속할 수 있으므로(선로 공유),
        // 그 기록 고유의 역 목록(_pidStations)이 있으면 그걸 우선 쓴다.
        const stationList = t._pidStations || physicalStations;
        const stationCount = getTripStationCount(stationList, t.from, t.to);
        const confirming = confirmId === t.id;
        return (
          <div key={t.id} className="px-4 sm:px-5 py-3.5 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[17px] text-ink">
                {displayStationName(t.from)}
                <span className="text-sub mx-1.5">→</span>
                {displayStationName(t.to)}
              </div>
              <div className="text-[13px] text-sub mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                <span className="tabular-nums">{formatDate(t.date)}</span>
                <span>{stationCount}개 역</span>
                {t.via && <span>{t.via}</span>}
                {t._pidName && <span>{t._pidName}</span>}
              </div>
              {t.note && <div className="text-[13px] text-ink/70 mt-1 truncate">{t.note}</div>}
            </div>
            {confirming ? (
              <div className="flex items-center gap-3 shrink-0 text-[15px] pt-0.5">
                <button onClick={() => onDelete(t)} className="text-[#e30000] font-medium">
                  삭제
                </button>
                <button onClick={() => setConfirmId(null)} className="text-link">
                  취소
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmId(t.id)} className="text-[15px] text-link shrink-0 pt-0.5">
                삭제
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
