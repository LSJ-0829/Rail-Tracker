import { useState, useEffect } from "react";
import { todayStr } from "../hooks/useProgress";
import { displayStationName } from "../utils/railData";

const VIA_SUGGESTIONS = [
  "KTX", "KTX산천", "KTX이음", "KTX청룡", "ITX새마을", "ITX마음", "ITX청춘",
  "새마을호", "무궁화호", "누리로", "전철/지하철", "기타",
];

function Field({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col ${className}`}>
      <span className="text-[12px] font-medium text-sub mb-1.5 px-0.5">{label}</span>
      {children}
    </label>
  );
}

/**
 * stations: 이 폼에서 선택 가능한 역 목록 (물리 선로 전체 기준 - 서비스가 일부만
 * 보여주더라도, 실제로 탄 구간은 그 서비스가 보여주는 범위를 넘어설 수 있으므로
 * 물리 선로 전체 역을 옵션으로 준다)
 */
export default function TripForm({ stations, onAdd }) {
  // 순환선(서울 2호선 등)은 배열 끝에 첫 역이 그대로 중복 등록돼 있다(예: 시청). 두 자리 모두
  // 같은 역 이름이라 드롭다운에서 골라도 구분할 수 없으므로, 목록에는 한 번만 보여준다.
  const pickerStations = Array.from(new Set(stations));
  const [from, setFrom] = useState(stations[0]);
  const [to, setTo] = useState(pickerStations[pickerStations.length - 1]);
  const [date, setDate] = useState(todayStr());
  const [via, setVia] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const unique = Array.from(new Set(stations));
    setFrom(stations[0]);
    setTo(unique[unique.length - 1]);
    setError("");
  }, [stations]);

  useEffect(() => {
    if (!saved) return undefined;
    const t = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(t);
  }, [saved]);

  const submit = () => {
    if (from === to) {
      setError("출발역과 도착역이 같아요.");
      return;
    }
    setError("");
    onAdd(from, to, date, note, via);
    setNote("");
    setSaved(true);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const stationOptions = pickerStations.map((s) => (
    <option key={s} value={s}>
      {displayStationName(s)}
    </option>
  ));

  return (
    <div className="card p-5 sm:p-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 mb-4">
        <Field label="출발역">
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="field appearance-none">
            {stationOptions}
          </select>
        </Field>
        <button
          type="button"
          onClick={swap}
          aria-label="출발역과 도착역 바꾸기"
          className="mb-1 w-9 h-9 rounded-full bg-canvas text-sub hover:text-ink hover:bg-[#e8e8ed] transition flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 4L3 8l4 4" />
            <path d="M3 8h14" />
            <path d="M17 20l4-4-4-4" />
            <path d="M21 16H7" />
          </svg>
        </button>
        <Field label="도착역">
          <select value={to} onChange={(e) => setTo(e.target.value)} className="field appearance-none">
            {stationOptions}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <Field label="날짜">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
        </Field>
        <Field label="이용 열차 (선택)">
          <input
            type="text"
            list="via-suggestions"
            value={via}
            onChange={(e) => setVia(e.target.value)}
            placeholder="예: 무궁화호"
            className="field"
          />
          <datalist id="via-suggestions">
            {VIA_SUGGESTIONS.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <Field label="메모 (선택)">
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 친구랑 여행" className="field" />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={submit} className="btn-primary">
          기록 추가
        </button>
        {error && <span className="text-[13px] text-[#e30000]">{error}</span>}
        {!error && saved && <span className="text-[13px] text-[#008009]">추가했어요.</span>}
      </div>
    </div>
  );
}
