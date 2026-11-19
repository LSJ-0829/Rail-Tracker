import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import stationCoords from "../data/stationCoords.json";
import {
  computePhysicalRegistry,
  derivedPhysicalSegments,
  getPhysicalLineList,
  hasOfficialColor,
} from "../utils/railData";

const UNRIDDEN_COLOR = "#636366";
// 공식 노선색이 없는 노선(경부선 등)은 앱 기본색이 거의 검정이라 안 탄 회색과 구분이 안 된다.
// 지도에서만 탄 구간을 이 색으로 칠한다(한국 노선색과 잘 겹치지 않는 자홍색).
const NO_COLOR_RIDDEN = "#e3006d";
const mapColor = (line) => (hasOfficialColor(line) ? line.color : NO_COLOR_RIDDEN);
const KOREA_BOUNDS = [
  [33.1, 124.6],
  [38.6, 131.0],
];

function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * 물리 노선 하나를 지도용 조각으로 나눈다. 역 좌표는 scripts/build_station_coords.py가
 * OpenStreetMap에서 뽑은 것이고, 좌표가 없는 역(신호장 등 일부)은 건너뛰고 앞뒤 역을 바로 잇는다.
 * 건너뛴 사이의 구간이 전부 탄 구간일 때만 그 연결선을 탄 것으로 칠한다.
 * 반환: [{ ridden, points: [[lat,lng], ...] }] — 같은 상태가 이어지는 구간끼리 한 선으로 묶는다.
 */
function buildRuns(stations, coords, ridden) {
  const known = [];
  stations.forEach((s, i) => {
    if (coords[s]) known.push(i);
  });
  const runs = [];
  for (let k = 0; k < known.length - 1; k++) {
    const a = known[k];
    const b = known[k + 1];
    let isRidden = true;
    for (let i = a; i < b; i++) {
      if (!ridden.has(`${i}-${i + 1}`)) {
        isRidden = false;
        break;
      }
    }
    const pa = coords[stations[a]];
    const pb = coords[stations[b]];
    const last = runs[runs.length - 1];
    if (last && last.ridden === isRidden && last.endIdx === a) {
      last.points.push(pb);
      last.endIdx = b;
      last.km += haversineKm(pa, pb);
    } else {
      runs.push({ ridden: isRidden, points: [pa, pb], endIdx: b, km: haversineKm(pa, pb) });
    }
  }
  return runs;
}

export default function RideMap({ trips, onSelectLine }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [showAll, setShowAll] = useState(true);
  // 팝업 버튼이 늘 최신 함수를 부르도록 ref로 들고 있는다(함수가 바뀔 때마다 선을 다시 그리지 않게)
  const selectRef = useRef(onSelectLine);
  selectRef.current = onSelectLine;

  const lineInfo = useMemo(() => {
    const registry = computePhysicalRegistry();
    return getPhysicalLineList().map((line) => {
      const stations = registry.get(line.id) || [];
      const ridden = derivedPhysicalSegments(stations, trips[line.id]);
      const runs = buildRuns(stations, stationCoords[line.id] || {}, ridden);
      const total = Math.max(0, stations.length - 1);
      return {
        line,
        runs,
        riddenSegments: ridden.size,
        totalSegments: total,
        riddenKm: runs.filter((r) => r.ridden).reduce((sum, r) => sum + r.km, 0),
      };
    });
  }, [trips]);

  const summary = useMemo(() => {
    const ridden = lineInfo.filter((l) => l.riddenSegments > 0);
    return {
      lines: ridden.length,
      km: Math.round(ridden.reduce((sum, l) => sum + l.riddenKm, 0)),
      ridden: [...ridden].sort((a, b) => b.riddenKm - a.riddenKm),
    };
  }, [lineInfo]);

  // 지도는 한 번만 만든다
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = L.map(containerRef.current, {
      preferCanvas: true,
      zoomSnap: 0.5,
      minZoom: 6,
      maxBounds: [
        [30.5, 121.5],
        [41, 134],
      ],
    });
    map.fitBounds(KOREA_BOUNDS);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      className: "rt-map-tile",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자',
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // 기록이나 보기 옵션이 바뀌면 선만 다시 그린다
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const renderer = L.canvas({ padding: 0.5, tolerance: 6 });

    const popupFor = (info) => {
      const el = document.createElement("div");
      el.style.minWidth = "140px";
      const title = document.createElement("div");
      title.textContent = info.line.name;
      title.style.fontWeight = "600";
      title.style.fontSize = "15px";
      const meta = document.createElement("div");
      meta.textContent = `${info.riddenSegments}/${info.totalSegments} 구간`;
      meta.style.color = "#6e6e73";
      meta.style.fontSize = "13px";
      meta.style.margin = "2px 0 8px";
      const btn = document.createElement("button");
      btn.textContent = "노선 보기 ›";
      btn.style.color = "#0066cc";
      btn.style.fontSize = "14px";
      btn.onclick = () => selectRef.current(info.line.id);
      el.append(title, meta, btn);
      return el;
    };

    // 안 탄 구간을 먼저 깔고 탄 구간을 위에 그린다
    if (showAll) {
      lineInfo.forEach((info) => {
        info.runs
          .filter((r) => !r.ridden)
          .forEach((r) => {
            L.polyline(r.points, { color: UNRIDDEN_COLOR, weight: 2, opacity: 0.85, renderer })
              .bindPopup(() => popupFor(info))
              .addTo(layer);
          });
      });
    }
    lineInfo.forEach((info) => {
      const color = mapColor(info.line);
      info.runs
        .filter((r) => r.ridden)
        .forEach((r) => {
          L.polyline(r.points, { color: "#ffffff", weight: 8, opacity: 0.9, renderer, interactive: false }).addTo(layer);
          L.polyline(r.points, { color, weight: 5, opacity: 1, renderer })
            .bindPopup(() => popupFor(info))
            .addTo(layer);
        });
    });
  }, [lineInfo, showAll]);

  const fitRidden = () => {
    const map = mapRef.current;
    if (!map) return;
    const pts = summary.ridden.flatMap((l) => l.runs.filter((r) => r.ridden).flatMap((r) => r.points));
    if (pts.length) map.fitBounds(pts, { padding: [24, 24], maxZoom: 12 });
    else map.fitBounds(KOREA_BOUNDS);
  };

  return (
    <main className="max-w-[980px] mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16">
      <h1 className="headline text-[34px] sm:text-[48px] leading-tight mb-2">지도</h1>
      <p className="text-[17px] text-ink/80 leading-snug mb-6">
        {summary.lines > 0 ? (
          <>
            {summary.lines}개 노선, 역 사이 직선 거리로 약 <span className="font-semibold tabular-nums">{summary.km.toLocaleString()}km</span>를 탔어요.
          </>
        ) : (
          "아직 기록된 구간이 없어요. 노선에서 구간을 기록하면 여기에 색으로 표시돼요."
        )}
      </p>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <button
          onClick={() => setShowAll((v) => !v)}
          className={`rounded-full px-4 py-1.5 text-[13px] transition ${showAll ? "bg-ink text-white" : "bg-white text-ink"}`}
          aria-pressed={showAll}
        >
          안 탄 노선도 보기
        </button>
        <button onClick={fitRidden} className="rounded-full px-4 py-1.5 text-[13px] bg-white text-ink transition hover:bg-[#e8e8ed]">
          탄 구간에 맞추기
        </button>
      </div>

      <div className="card overflow-hidden">
        <div ref={containerRef} className="h-[62vh] min-h-[360px] w-full" />
      </div>

      <div className="flex gap-x-5 gap-y-2 text-[12px] text-sub flex-wrap px-1 mt-3 mb-10">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-1 rounded bg-[#0052A4]" /> 탄 구간 (노선 색, 색이 없는 노선은{" "}
          <span className="inline-block w-3 h-1 rounded align-middle" style={{ backgroundColor: NO_COLOR_RIDDEN }} />)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-1 rounded" style={{ backgroundColor: UNRIDDEN_COLOR }} /> 안 탄 구간
        </span>
        <span>선을 누르면 노선 이름과 완주 구간이 나와요. 역과 역을 직선으로 이은 그림이라 실제 선로 모양과는 달라요.</span>
      </div>

      {summary.ridden.length > 0 && (
        <section className="max-w-[720px]">
          <h2 className="headline text-[28px] mb-4 px-1">탄 노선</h2>
          <div className="grouped">
            {summary.ridden.map((info) => (
              <button
                key={info.line.id}
                onClick={() => onSelectLine(info.line.id)}
                className="w-full text-left px-4 sm:px-5 py-3.5 flex items-center gap-3.5 transition hover:bg-[#fafafc] active:bg-[#f0f0f3]"
              >
                <span className="inline-block w-4 h-1.5 rounded-full shrink-0" style={{ backgroundColor: mapColor(info.line) }} />
                <span className="flex-1 min-w-0 text-[17px] text-ink truncate">{info.line.name}</span>
                <span className="text-[13px] text-sub tabular-nums shrink-0">
                  약 {Math.round(info.riddenKm).toLocaleString()}km · {info.riddenSegments}/{info.totalSegments}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="max-w-[720px] text-[12px] text-sub leading-relaxed mt-10">
        역 위치와 바탕 지도는 OpenStreetMap(ODbL) 데이터예요. 바탕 지도는 인터넷에 연결돼 있을 때만 보여요.
      </footer>
    </main>
  );
}
