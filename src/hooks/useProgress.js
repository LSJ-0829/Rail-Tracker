import { useState, useEffect } from "react";

const STORAGE_KEY = "rail-progress-v2";

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

export function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * 방문 역 / 물리 선로별 구간 기록(trip)을 localStorage에 저장하는 훅.
 * 데이터 구조: { visited: string[], trips: { [physicalLineId]: Trip[] } }
 * Trip: { id, from, to, date, via, note }
 * trips는 "서비스(1호선/경부선전체/무궁화호 등)" id가 아니라 물리 선로 id로 저장되므로,
 * 같은 물리 선로를 공유하는 서비스들끼리는 기록이 자동으로 공유된다.
 */
export function useProgress() {
  const [visited, setVisited] = useState(new Set());
  const [trips, setTrips] = useState({});
  const [startDate, setStartDate] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let parsed = null;
      if (raw) {
        parsed = JSON.parse(raw);
        setVisited(new Set(parsed.visited || []));
        setTrips(parsed.trips || {});
      }
      // 처음 쓰는 브라우저면 오늘 날짜를 "기록 시작일"로 저장
      let start = parsed && parsed.startDate;
      if (!start) {
        start = todayStr();
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            visited: (parsed && parsed.visited) || [],
            trips: (parsed && parsed.trips) || {},
            startDate: start,
          })
        );
      }
      setStartDate(start);
    } catch (e) {
      console.error("저장된 기록을 불러오지 못했어요", e);
    } finally {
      setLoaded(true);
    }
  }, []);

  const persist = (nextVisited, nextTrips) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ visited: Array.from(nextVisited), trips: nextTrips, startDate })
      );
    } catch (e) {
      console.error("저장 실패", e);
    }
  };

  const toggleStation = (name) => {
    setVisited((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      persist(next, trips);
      return next;
    });
  };

  const addTrip = (physicalId, from, to, date, note, via) => {
    setTrips((prev) => {
      const list = prev[physicalId] ? [...prev[physicalId]] : [];
      list.push({ id: makeId(), from, to, date, via: via || "", note: note || "" });
      const next = { ...prev, [physicalId]: list };
      persist(visited, next);
      return next;
    });
  };

  const deleteTrip = (physicalId, tripId) => {
    setTrips((prev) => {
      const list = (prev[physicalId] || []).filter((t) => t.id !== tripId);
      const next = { ...prev, [physicalId]: list };
      persist(visited, next);
      return next;
    });
  };

  const resetAll = () => {
    const empty1 = new Set();
    const empty2 = {};
    setVisited(empty1);
    setTrips(empty2);
    persist(empty1, empty2);
  };

  return { visited, trips, startDate, loaded, toggleStation, addTrip, deleteTrip, resetAll };
}
