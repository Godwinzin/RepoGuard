import { useId, useRef, useState } from "react";

const W = 720;
const H = 280;
const PAD = { top: 18, right: 20, bottom: 30, left: 40 };
const GRID = [0, 25, 50, 75, 100];

function formatDay(day) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function TrendChart({ points }) {
  const gradientId = `fill-${useId().replace(/:/g, "")}`;
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const xAt = (i) =>
    PAD.left +
    (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (value) => PAD.top + innerH - (value / 100) * innerH;

  // Days before the first audit have no score, so they are skipped
  const dots = points
    .map((point, i) =>
      point.avg_score === null
        ? null
        : { i, x: xAt(i), y: yAt(point.avg_score), point },
    )
    .filter(Boolean);

  if (dots.length === 0) {
    return (
      <div className="chart-empty">
        Run an audit and your health trend will appear here.
      </div>
    );
  }

  const line = dots
    .map((d, k) => `${k === 0 ? "M" : "L"}${d.x.toFixed(1)},${d.y.toFixed(1)}`)
    .join(" ");
  const base = yAt(0);
  const area = `${line} L${dots[dots.length - 1].x.toFixed(1)},${base} L${dots[0].x.toFixed(1)},${base} Z`;

  // The hovered point, or the latest one when nobody is pointing
  const active = dots.find((d) => d.i === hover) ?? dots[dots.length - 1];

  function handleMove(event) {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;

    let nearest = dots[0];
    for (const d of dots) {
      if (Math.abs(d.x - px) < Math.abs(nearest.x - px)) nearest = d;
    }
    setHover(nearest.i);
  }

  const last = points.length - 1;
  const labelIndexes = [
    ...new Set([0, Math.round(last / 3), Math.round((last * 2) / 3), last]),
  ];

  return (
    <div className="chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Average health score over time"
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" className="chart-stop-top" />
            <stop offset="100%" className="chart-stop-bottom" />
          </linearGradient>
        </defs>

        {GRID.map((value) => (
          <g key={value}>
            <line
              className="chart-grid"
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yAt(value)}
              y2={yAt(value)}
            />
            <text
              className="chart-axis"
              x={PAD.left - 10}
              y={yAt(value) + 4}
              textAnchor="end"
            >
              {value}
            </text>
          </g>
        ))}

        {labelIndexes.map((i, k) => (
          <text
            key={i}
            className="chart-axis"
            x={xAt(i)}
            y={H - 8}
            textAnchor={k === 0 ? "start" : i === last ? "end" : "middle"}
          >
            {formatDay(points[i].day)}
          </text>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} className="chart-line" />

        {hover !== null && (
          <line
            className="chart-cursor"
            x1={active.x}
            x2={active.x}
            y1={PAD.top}
            y2={base}
          />
        )}
        <circle className="chart-dot" cx={active.x} cy={active.y} r="5" />
      </svg>

      <div
        className={`chart-tip ${active.x / W > 0.8 ? "chart-tip-end" : ""}`}
        style={{
          left: `${(active.x / W) * 100}%`,
          top: `${(active.y / H) * 100}%`,
        }}
      >
        <strong>{active.point.avg_score}/100</strong>
        <small>
          {formatDay(active.point.day)} · {active.point.problems}{" "}
          {active.point.problems === 1 ? "open problem" : "open problems"}
        </small>
      </div>
    </div>
  );
}
