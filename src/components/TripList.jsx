export default function TripList({ physicalStations, lineTrips, onDelete }) {
  const sorted = [...(lineTrips || [])].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sorted.length === 0) {
    return <p className="text-xs text-neutral-400 px-1">아직 기록된 구간이 없어요. 위에서 추가해보세요.</p>;
  }

  return (
    <div className="space-y-1.5">
      {sorted.map((t) => {
        const i1 = physicalStations.indexOf(t.from);
        const i2 = physicalStations.indexOf(t.to);
        const stationCount = Math.abs(i1 - i2) + 1;
        return (
          <div key={t.id} className="flex items-center gap-2 text-sm bg-white border border-neutral-200 rounded-lg px-3 py-2 flex-wrap">
            <span className="text-neutral-400 text-xs w-24 shrink-0">{t.date}</span>
            <span className="font-medium">
              {t.from} → {t.to}
            </span>
            <span className="text-xs text-neutral-400">({stationCount}개 역 구간)</span>
            {t._pidName && <span className="text-[10px] text-neutral-400 border border-neutral-200 rounded-full px-2 py-0.5">{t._pidName}</span>}
            {t.via && <span className="text-xs bg-neutral-100 text-neutral-600 rounded-full px-2 py-0.5">{t.via}</span>}
            {t.note && <span className="text-xs text-neutral-500 flex-1 truncate">· {t.note}</span>}
            <button onClick={() => onDelete(t)} className="ml-auto text-neutral-300 hover:text-red-500 text-xs shrink-0">
              삭제
            </button>
          </div>
        );
      })}
    </div>
  );
}
