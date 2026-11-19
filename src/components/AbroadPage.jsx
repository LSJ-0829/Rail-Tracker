import { useEffect, useState } from "react";
import { todayStr } from "../hooks/useProgress";
import { countryKey } from "../hooks/useAbroad";
import { Chevron } from "./Lobby";

const COUNTRY_SUGGESTIONS = [
  "일본", "중국", "대만", "홍콩", "태국", "베트남", "싱가포르", "말레이시아", "인도",
  "영국", "프랑스", "독일", "스위스", "이탈리아", "스페인", "오스트리아", "네덜란드", "체코",
  "미국", "캐나다", "호주", "뉴질랜드",
];

const NOT_COUNTED = "국내 전체 완주율과 노선별 완주율에는 포함되지 않아요.";

function formatDate(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return `${y}. ${m}. ${day}.`;
}

function lastRideDate(country) {
  return (country.rides || []).reduce((max, r) => (r.date && r.date > max ? r.date : max), "");
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col ${className}`}>
      <span className="text-[12px] font-medium text-sub mb-1.5 px-0.5">{label}</span>
      {children}
    </label>
  );
}

export default function AbroadPage({ abroad }) {
  const { countries, findCountry, addCountry, updateCountry, deleteCountry, addRide, deleteRide } = abroad;
  const [selectedId, setSelectedId] = useState(null);
  const selected = countries.find((c) => c.id === selectedId) || null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedId]);

  if (selected) {
    return (
      <CountryDetail
        country={selected}
        isNameTaken={(name) => {
          const other = findCountry(name);
          return Boolean(other && other.id !== selected.id);
        }}
        onBack={() => setSelectedId(null)}
        onUpdate={(fields) => updateCountry(selected.id, fields)}
        onDelete={() => {
          deleteCountry(selected.id);
          setSelectedId(null);
        }}
        onAddRide={(ride) => addRide(selected.id, ride)}
        onDeleteRide={(rideId) => deleteRide(selected.id, rideId)}
      />
    );
  }

  // 최근에 탄 나라가 위로, 기록이 없는 나라는 이름순으로 아래에
  const sorted = [...countries].sort((a, b) => {
    const da = lastRideDate(a);
    const db = lastRideDate(b);
    if (da !== db) return da < db ? 1 : -1;
    return a.name.localeCompare(b.name, "ko");
  });
  const rideCount = countries.reduce((n, c) => n + (c.rides || []).length, 0);
  const lineCount = countries.reduce(
    (n, c) => n + new Set((c.rides || []).map((r) => (r.line || "").trim()).filter(Boolean)).size,
    0
  );

  return (
    <main>
      <section className="bg-white text-center px-5 pt-14 pb-12 sm:pt-20 sm:pb-16">
        <p className="text-[17px] sm:text-[21px] font-semibold text-sub mb-2">해외 철도 기록</p>
        <h1 className="headline text-[40px] leading-[1.08] sm:text-[64px] sm:leading-[1.05] mb-4">나라마다 한 묶음.</h1>
        <p className="text-[17px] sm:text-[19px] text-ink/80 max-w-lg mx-auto leading-snug">
          해외에서 탄 열차를 나라별로 모아 둬요. {NOT_COUNTED}
        </p>
      </section>

      <section className="max-w-[980px] mx-auto px-3 sm:px-6 py-3 sm:py-6 grid grid-cols-3 gap-3">
        <Stat label="나라" value={countries.length} />
        <Stat label="탄 구간" value={rideCount} />
        <Stat label="탄 노선" value={lineCount} />
      </section>

      <section className="max-w-[720px] mx-auto px-4 sm:px-6 pt-6 pb-4">
        <h2 className="headline text-[28px] mb-4 px-1">나라 추가</h2>
        <AddCountryForm
          onSubmit={(name) => {
            const existing = findCountry(name);
            setSelectedId(existing ? existing.id : addCountry(name));
          }}
        />
      </section>

      <section className="max-w-[720px] mx-auto px-4 sm:px-6 pt-8 pb-16">
        <h2 className="headline text-[28px] mb-4 px-1">
          나라 <span className="text-sub font-normal">{countries.length}</span>
        </h2>
        {sorted.length === 0 ? (
          <div className="card px-5 py-8 text-center text-[15px] text-sub">아직 추가한 나라가 없어요.</div>
        ) : (
          <div className="grouped">
            {sorted.map((c) => {
              const last = lastRideDate(c);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className="w-full text-left px-4 sm:px-5 py-3.5 flex items-center gap-3 transition hover:bg-[#fafafc] active:bg-[#f0f0f3]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[17px] text-ink truncate">{c.name}</div>
                    {last && <div className="text-[13px] text-sub mt-0.5 tabular-nums">최근 {formatDate(last)}</div>}
                  </div>
                  <span className="text-[15px] text-sub tabular-nums shrink-0">{(c.rides || []).length}개 구간</span>
                  <Chevron className="text-[#c7c7cc]" />
                </button>
              );
            })}
          </div>
        )}
        <p className="text-[12px] text-sub leading-relaxed mt-5 px-1">
          해외 기록은 국내 기록과 따로 이 브라우저에 저장되고, 국내 &lsquo;전체 기록 초기화&rsquo;로는 지워지지 않아요.
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card px-4 py-5 text-center">
      <div className="text-[12px] sm:text-[13px] text-sub mb-1">{label}</div>
      <div className="font-semibold tracking-tight text-[24px] sm:text-[32px] leading-tight tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

function CountryInput({ value, onChange }) {
  return (
    <>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list="abroad-country-suggestions"
        placeholder="예: 일본"
        className="field"
      />
      <datalist id="abroad-country-suggestions">
        {COUNTRY_SUGGESTIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  );
}

function AddCountryForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("나라 이름을 적어 주세요.");
      return;
    }
    setError("");
    onSubmit(name.trim());
    setName("");
  };

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-end gap-3">
        <Field label="나라" className="flex-1">
          <CountryInput value={name} onChange={setName} />
        </Field>
        <button onClick={submit} className="btn-primary shrink-0">
          추가
        </button>
      </div>
      {error ? (
        <p className="text-[13px] text-[#e30000] mt-2 px-0.5">{error}</p>
      ) : (
        <p className="text-[12px] text-sub mt-2 px-0.5">이미 있는 나라를 적으면 그 나라로 바로 들어가요.</p>
      )}
    </div>
  );
}

function RideForm({ knownLines, onAdd }) {
  const [line, setLine] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(todayStr());
  const [via, setVia] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return undefined;
    const t = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(t);
  }, [saved]);

  const submit = () => {
    if (!from.trim() || !to.trim()) {
      setError("출발역과 도착역을 적어 주세요.");
      return;
    }
    setError("");
    onAdd({ line: line.trim(), from: from.trim(), to: to.trim(), date, via: via.trim(), note: note.trim() });
    // 이어서 타는 경우가 많으니 노선·날짜는 남기고, 도착역을 다음 출발역으로 넣어 둔다
    setFrom(to.trim());
    setTo("");
    setNote("");
    setSaved(true);
  };

  return (
    <div className="card p-5 sm:p-6">
      <div className="grid sm:grid-cols-3 gap-3 mb-3">
        <Field label="노선 (선택)">
          <input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            list="abroad-line-suggestions"
            placeholder="예: 도카이도 신칸센"
            className="field"
          />
          <datalist id="abroad-line-suggestions">
            {knownLines.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>
        <Field label="출발역">
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="예: 도쿄" className="field" />
        </Field>
        <Field label="도착역">
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="예: 신오사카" className="field" />
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <Field label="날짜">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
        </Field>
        <Field label="이용 열차 (선택)">
          <input value={via} onChange={(e) => setVia(e.target.value)} placeholder="예: 노조미" className="field" />
        </Field>
        <Field label="메모 (선택)">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 후지산 쪽 창가" className="field" />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={submit} className="btn-primary">
          구간 추가
        </button>
        {error && <span className="text-[13px] text-[#e30000]">{error}</span>}
        {!error && saved && <span className="text-[13px] text-[#008009]">추가했어요.</span>}
      </div>
    </div>
  );
}

function EditCountryForm({ country, isNameTaken, onSave, onCancel }) {
  const [name, setName] = useState(country.name);
  const [note, setNote] = useState(country.note || "");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("나라 이름을 적어 주세요.");
      return;
    }
    if (countryKey(name) !== countryKey(country.name) && isNameTaken(name)) {
      setError("같은 이름의 나라가 이미 있어요.");
      return;
    }
    onSave({ name: name.trim(), note: note.trim() });
  };

  return (
    <div className="card p-5 sm:p-6">
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <Field label="나라">
          <CountryInput value={name} onChange={setName} />
        </Field>
        <Field label="메모 (선택)">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: JR 패스 두 번 사용" className="field" />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={submit} className="btn-primary">
          저장
        </button>
        <button onClick={onCancel} className="text-[15px] text-link">
          취소
        </button>
        {error && <span className="text-[13px] text-[#e30000]">{error}</span>}
      </div>
    </div>
  );
}

function CountryDetail({ country, isNameTaken, onBack, onUpdate, onDelete, onAddRide, onDeleteRide }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRideId, setConfirmRideId] = useState(null);
  // 최근 기록이 위로
  const rides = [...(country.rides || [])].sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : -1));
  const knownLines = Array.from(new Set(rides.map((r) => r.line).filter(Boolean)));

  // 노선별로 몇 구간 탔는지
  const byLine = new Map();
  rides.forEach((r) => {
    const key = r.line || "노선 미입력";
    byLine.set(key, (byLine.get(key) || 0) + 1);
  });

  return (
    <main className="max-w-[980px] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-16">
      <button onClick={onBack} className="text-[15px] text-link mb-6 inline-flex items-center gap-1">
        <svg width="8" height="13" viewBox="0 0 8 13" fill="none" aria-hidden>
          <path d="M6.5 1.5L1.5 6.5L6.5 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        해외
      </button>

      {editing ? (
        <div className="max-w-[720px] mb-10">
          <EditCountryForm
            country={country}
            isNameTaken={isNameTaken}
            onSave={(fields) => {
              onUpdate(fields);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="mb-8">
          <h1 className="headline text-[34px] sm:text-[48px] leading-tight mb-2">{country.name}</h1>
          <p className="text-[15px] text-sub flex flex-wrap gap-x-3">
            <span className="tabular-nums">
              {rides.length}개 구간 · {knownLines.length}개 노선
            </span>
            <button onClick={() => setEditing(true)} className="text-link">
              편집
            </button>
          </p>
          {country.note && <p className="text-[15px] text-ink/80 mt-2">{country.note}</p>}
          <p className="text-[12px] text-sub mt-3">{NOT_COUNTED}</p>
        </div>
      )}

      {byLine.size > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {Array.from(byLine.entries()).map(([name, n]) => (
            <span key={name} className="bg-white rounded-full px-3.5 py-1.5 text-[13px] text-ink">
              {name} <span className="text-sub tabular-nums">{n}</span>
            </span>
          ))}
        </div>
      )}

      <section className="max-w-[720px] mb-12">
        <h2 className="headline text-[28px] mb-4 px-1">구간 기록 추가</h2>
        <RideForm key={country.id} knownLines={knownLines} onAdd={onAddRide} />
      </section>

      <section className="max-w-[720px] mb-14">
        <h2 className="headline text-[28px] mb-4 px-1">
          탄 구간 <span className="text-sub font-normal">{rides.length}</span>
        </h2>
        {rides.length === 0 ? (
          <div className="card px-5 py-8 text-center text-[15px] text-sub">아직 기록된 구간이 없어요.</div>
        ) : (
          <div className="grouped">
            {rides.map((r) => (
              <div key={r.id} className="px-4 sm:px-5 py-3.5 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[17px] text-ink">
                    {r.from}
                    <span className="text-sub mx-1.5">→</span>
                    {r.to}
                  </div>
                  <div className="text-[13px] text-sub mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span className="tabular-nums">{formatDate(r.date)}</span>
                    {r.line && <span>{r.line}</span>}
                    {r.via && <span>{r.via}</span>}
                    {r.trip && <span>{r.trip}</span>}
                  </div>
                  {r.note && <div className="text-[13px] text-ink/70 mt-1 truncate">{r.note}</div>}
                </div>
                {confirmRideId === r.id ? (
                  <div className="flex items-center gap-3 shrink-0 text-[15px] pt-0.5">
                    <button onClick={() => onDeleteRide(r.id)} className="text-[#e30000] font-medium">
                      삭제
                    </button>
                    <button onClick={() => setConfirmRideId(null)} className="text-link">
                      취소
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmRideId(r.id)} className="text-[15px] text-link shrink-0 pt-0.5">
                    삭제
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="max-w-[720px] border-t border-hair pt-5 text-[12px] text-sub">
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="text-link">
            이 나라 기록 삭제…
          </button>
        ) : (
          <span className="inline-flex items-center gap-3 flex-wrap">
            <span className="text-ink">
              &lsquo;{country.name}&rsquo;과 구간 {rides.length}개를 지울까요? 되돌릴 수 없어요.
            </span>
            <button onClick={onDelete} className="text-[#e30000] font-medium">
              삭제
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-link">
              취소
            </button>
          </span>
        )}
      </footer>
    </main>
  );
}
