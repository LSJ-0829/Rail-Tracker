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
 *
 * visited와 trips를 하나의 state로 묶어서 관리한다. 예전에는 두 개의 별도 useState였는데,
 * addTrip/deleteTrip이 persist(visited, next)를 호출할 때의 visited가 클로저로 캡처된
 * (그 시점 렌더의) 값이라 toggleStation과 addTrip이 거의 동시에 일어나면 둘 중 하나의
 * 변경이 저장에서 누락될 수 있었다. 하나의 setState 업데이터 안에서 prev를 통해 항상 최신
 * 값을 참조하고 그 자리에서 바로 persist하면 이 문제가 원천적으로 사라진다.
 */
export function useProgress() {
  const [state, setState] = useState({ visited: new Set(), trips: {} });
  const [startDate, setStartDate] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let parsed = null;
      if (raw) {
        parsed = JSON.parse(raw);
        setState({ visited: new Set(parsed.visited || []), trips: parsed.trips || {} });
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

  const persist = (nextVisited, nextTrips, nextStartDate) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ visited: Array.from(nextVisited), trips: nextTrips, startDate: nextStartDate })
      );
    } catch (e) {
      console.error("저장 실패", e);
    }
  };

  const toggleStation = (name) => {
    setState((prev) => {
      const nextVisited = new Set(prev.visited);
      if (nextVisited.has(name)) nextVisited.delete(name);
      else nextVisited.add(name);
      persist(nextVisited, prev.trips, startDate);
      return { visited: nextVisited, trips: prev.trips };
    });
  };

  const addTrip = (physicalId, from, to, date, note, via) => {
    setState((prev) => {
      const list = prev.trips[physicalId] ? [...prev.trips[physicalId]] : [];
      list.push({ id: makeId(), from, to, date, via: via || "", note: note || "" });
      const nextTrips = { ...prev.trips, [physicalId]: list };
      persist(prev.visited, nextTrips, startDate);
      return { visited: prev.visited, trips: nextTrips };
    });
  };

  const deleteTrip = (physicalId, tripId) => {
    setState((prev) => {
      const list = (prev.trips[physicalId] || []).filter((t) => t.id !== tripId);
      const nextTrips = { ...prev.trips, [physicalId]: list };
      persist(prev.visited, nextTrips, startDate);
      return { visited: prev.visited, trips: nextTrips };
    });
  };

  const resetAll = () => {
    const empty = { visited: new Set(), trips: {} };
    setState(empty);
    persist(empty.visited, empty.trips, startDate);
  };

  return {
    visited: state.visited,
    trips: state.trips,
    startDate,
    loaded,
    toggleStation,
    addTrip,
    deleteTrip,
    resetAll,
  };
}
