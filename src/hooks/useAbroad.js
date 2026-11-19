import { useEffect, useState } from "react";

// 해외 철도 기록은 국내 완주 기록(rail-progress-v2)과 일부러 다른 키에 따로 저장한다.
// 국내 노선 데이터가 아니라 자유 입력이라 완주율·역 방문 집계에 섞이면 안 되고,
// 국내 데이터 버전 마이그레이션(migrations.js)의 영향도 받지 않게 하기 위해서다.
const STORAGE_KEY = "rail-abroad-v2";
// v1은 여행(슬롯) 단위였다. 처음 한 번 나라 단위로 옮기고, 원본은 그대로 남겨 둔다.
const LEGACY_KEY = "rail-abroad-v1";

function makeId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function countryKey(name) {
  return (name || "").replace(/\s+/g, "").toLowerCase();
}

// v1 여행 → v2 나라. 같은 나라의 여행은 하나로 합치고, 나라를 안 적은 여행은 "나라 미입력"으로 모은다.
// 원래 여행 이름은 각 구간의 trip 필드에 남긴다.
function migrateLegacy(raw) {
  const parsed = JSON.parse(raw);
  const journeys = Array.isArray(parsed.journeys) ? parsed.journeys : [];
  const byKey = new Map();
  journeys.forEach((j) => {
    // 나라도 구간도 없는 빈 여행은 옮길 것이 없다
    if (!(j.country || "").trim() && !(j.rides || []).length) return;
    const name = (j.country || "").trim() || "나라 미입력";
    const key = countryKey(name);
    if (!byKey.has(key)) byKey.set(key, { id: makeId("c"), name, note: "", rides: [], createdAt: j.createdAt || Date.now() });
    const c = byKey.get(key);
    (j.rides || []).forEach((r) => c.rides.push({ ...r, trip: j.title || "" }));
  });
  return Array.from(byKey.values());
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.countries) ? parsed.countries : [];
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const countries = migrateLegacy(legacy);
      save(countries);
      return countries;
    }
    return [];
  } catch (e) {
    console.error("해외 기록을 불러오지 못했어요", e);
    return [];
  }
}

function save(countries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, countries }));
  } catch (e) {
    console.error("해외 기록 저장 실패", e);
  }
}

/**
 * 해외 철도 기록 (나라 단위).
 * Country: { id, name, note, rides: Ride[], createdAt }
 * Ride: { id, line, from, to, date, via, note, trip? }  — trip은 v1에서 옮겨 온 여행 이름
 */
export function useAbroad() {
  const [countries, setCountries] = useState(() => load());

  // 다른 탭에서 바뀐 내용도 따라가게 한다
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setCountries(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (fn) => {
    setCountries((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  };

  const findCountry = (name) => countries.find((c) => countryKey(c.name) === countryKey(name)) || null;

  // 같은 이름의 나라가 이미 있으면 새로 만들지 않고 그 나라 id를 돌려준다
  const addCountry = (name, note = "") => {
    const existing = findCountry(name);
    if (existing) return existing.id;
    const id = makeId("c");
    update((prev) => [...prev, { id, name: name.trim(), note: note.trim(), rides: [], createdAt: Date.now() }]);
    return id;
  };

  const updateCountry = (id, fields) => {
    update((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
  };

  const deleteCountry = (id) => {
    update((prev) => prev.filter((c) => c.id !== id));
  };

  const addRide = (countryId, ride) => {
    update((prev) =>
      prev.map((c) => (c.id === countryId ? { ...c, rides: [...(c.rides || []), { id: makeId("r"), ...ride }] } : c))
    );
  };

  const deleteRide = (countryId, rideId) => {
    update((prev) =>
      prev.map((c) => (c.id === countryId ? { ...c, rides: (c.rides || []).filter((r) => r.id !== rideId) } : c))
    );
  };

  return { countries, findCountry, addCountry, updateCountry, deleteCountry, addRide, deleteRide };
}
