import { useState, useEffect } from "react";
import { todayStr } from "../hooks/useProgress";

const VIA_SUGGESTIONS = ["전철/지하철", "무궁화호", "ITX-새마을", "새마을호", "KTX", "대경선", "누리로", "기타"];

/**
 * stations: 이 폼에서 선택 가능한 역 목록 (물리 선로 전체 기준 - 서비스가 일부만
 * 보여주더라도, 실제로 탄 구간은 그 서비스가 보여주는 범위를 넘어설 수 있으므로
 * 물리 선로 전체 역을 옵션으로 준다)
 */
export default function TripForm({ stations, onAdd }) {
  const [from, setFrom] = useState(stations[0]);
  const [to, setTo] = useState(stations[stations.length - 1]);
  const [date, setDate] = useState(todayStr());
  const [via, setVia] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setFrom(stations[0]);
    setTo(stations[stations.length - 1]);
    setError("");
  }, [stations]);

  const submit = () => {
    if (from === to) {
      setError("출발역과 도착역이 같아요.");
      return;
    }
    setError("");
    onAdd(from, to, date, note, via);
    setNote("");
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-3 flex flex-wrap gap-2 items-end">
      <div className="flex flex-col">
        <label className="text-[11px] text-neutral-500 mb-1">출발역</label>
        <select value={from} onChange={(e) => setFrom(e.target.value)} className="text-sm border border-neutral-300 rounded-lg px-2 py-1.5 max-w-[9rem]">
          {stations.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-[11px] text-neutral-500 mb-1">도착역</label>
        <select value={to} onChange={(e) => setTo(e.target.value)} className="text-sm border border-neutral-300 rounded-lg px-2 py-1.5 max-w-[9rem]">
          {stations.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-[11px] text-neutral-500 mb-1">날짜</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm border border-neutral-300 rounded-lg px-2 py-1.5" />
      </div>
      <div className="flex flex-col">
        <label className="text-[11px] text-neutral-500 mb-1">이용 열차 (선택)</label>
        <input
          type="text"
          list="via-suggestions"
          value={via}
          onChange={(e) => setVia(e.target.value)}
          placeholder="예: 무궁화호"
          className="text-sm border border-neutral-300 rounded-lg px-2 py-1.5 w-32"
        />
        <datalist id="via-suggestions">
          {VIA_SUGGESTIONS.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-col flex-1 min-w-[8rem]">
        <label className="text-[11px] text-neutral-500 mb-1">메모 (선택)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예: 친구랑 여행"
          className="text-sm border border-neutral-300 rounded-lg px-2 py-1.5 w-full"
        />
      </div>
      <button onClick={submit} className="text-sm font-medium bg-neutral-900 text-white rounded-lg px-4 py-1.5 hover:bg-neutral-700">
        기록 추가
      </button>
      {error && <span className="text-xs text-red-500 w-full">{error}</span>}
    </div>
  );
}
