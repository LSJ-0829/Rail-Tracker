export default function LineDiagram({ line, visited, covered, onToggleStation, stationStyles, transferInfo }) {
  const stations = line.stations || [];
  const styles = stationStyles || stations.map(() => ({ color: "#111827", colored: false }));
  const stepX = 92;
  const width = Math.max(600, stations.length * stepX + 80);
  const height = 190;
  const cy = 100;

  const segmentColor = (i) => {
    const a = styles[i];
    const b = styles[i + 1];
    if (a && a.colored) return a.color;
    if (b && b.colored) return b.color;
    return "#111827";
  };

  return (
    <div className="overflow-x-auto border border-neutral-200 rounded-xl bg-white">
      <svg width={width} height={height} style={{ minWidth: width }}>
        {stations.map((st, i) => {
          if (i === stations.length - 1) return null;
          const x1 = 60 + i * stepX;
          const x2 = 60 + (i + 1) * stepX;
          const isRidden = covered.has(st) && covered.has(stations[i + 1]);
          return (
            <line
              key={`${line.id}-seg-${i}`}
              x1={x1}
              y1={cy}
              x2={x2}
              y2={cy}
              stroke={isRidden ? segmentColor(i) : "#D9D9D9"}
              strokeWidth={isRidden ? 6 : 4}
              strokeDasharray={isRidden ? "0" : "2 6"}
            />
          );
        })}
        {stations.map((st, i) => {
          const x = 60 + i * stepX;
          const isVisited = visited.has(st);
          const labelUp = i % 2 === 0;
          const size = isVisited ? 11 : 8;
          const { color, colored } = styles[i] || { color: "#111827", colored: false };
          const stTransfers = (transferInfo && transferInfo[st]) || { urban: [], hasPassenger: false, passengerLines: [] };
          const urbanTransfers = stTransfers.urban || [];
          const hasPassenger = Boolean(stTransfers.hasPassenger);
          // 역 마커 색은 이미 이 역을 지나는 도시철도 노선 중 하나의 색을 쓰고 있으므로(자체 공식
          // 색이 있는 서울교통공사 N호선 물리 노선이거나, 공식 색이 없어 첫 매칭 노선 색을 빌려온 경우),
          // 그 노선을 또 링으로 그리면 안쪽 마커와 바깥 링에 같은 색이 겹쳐 보인다. 배열에서의 위치와
          // 무관하게 마커와 색이 같은 항목은 전부 링에서 제외하고, 진짜 다른 노선만 링으로 보여준다.
          const ringTransfers = urbanTransfers.filter((t) => t.color !== color);

          return (
            <g key={st + i} style={{ cursor: "pointer" }} onClick={() => onToggleStation(st)}>
              {/* Concentric transfer rings colored with transfer lines' official colors */}
              {ringTransfers.map((trItem, trIdx) => {
                const ringRadius = size + 4 + trIdx * 3.5;
                return (
                  <circle
                    key={`${st}-tr-${trIdx}`}
                    cx={x}
                    cy={cy}
                    r={ringRadius}
                    fill="none"
                    stroke={trItem.color || "#9CA3AF"}
                    strokeWidth={2.5}
                  />
                );
              })}

              {colored ? (
                <circle
                  cx={x}
                  cy={cy}
                  r={size}
                  fill={isVisited ? color : "#FFFFFF"}
                  stroke={color}
                  strokeWidth={3}
                />
              ) : (
                <rect
                  x={x - size}
                  y={cy - size}
                  width={size * 2}
                  height={size * 2}
                  fill={isVisited ? color : "#FFFFFF"}
                  stroke={color}
                  strokeWidth={3}
                />
              )}

              {/* Intercity Passenger Train Indicator (KTX, SRT, ITX, 무궁화 등) */}
              {hasPassenger && (
                <rect
                  x={x + size - 2}
                  y={cy - size - 12}
                  width={9}
                  height={9}
                  transform={`rotate(45 ${x + size + 2.5} ${cy - size - 7.5})`}
                  fill="#9A3412"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              )}

              {(urbanTransfers.length > 0 || hasPassenger) && (
                <title>
                  {`${st}${urbanTransfers.length > 0 ? ` (전철 환승: ${urbanTransfers.map((t) => t.name).join(", ")})` : ""}${hasPassenger ? ` (여객열차: ${stTransfers.passengerLines.join(", ")})` : ""}`}
                </title>
              )}

              <text
                x={x}
                y={labelUp ? cy - 22 : cy + 34}
                textAnchor="middle"
                fontSize="12"
                fontWeight={isVisited ? 700 : 500}
                fill={isVisited ? "#1a1a1a" : "#8a8a8a"}
                transform={`rotate(-35 ${x} ${labelUp ? cy - 22 : cy + 34})`}
              >
                {st}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
