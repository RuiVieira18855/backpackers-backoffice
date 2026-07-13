import type { TrailValueKey } from "@/lib/db/schema";

const AXES: Array<{ key: TrailValueKey; label: string }> = [
  { key: "T", label: "Transformação" },
  { key: "R", label: "Respeito" },
  { key: "I", label: "Inovação" },
  { key: "L", label: "Liberdade" },
  { key: "H", label: "Harmonia" },
  { key: "A", label: "Aventura" },
];

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 130;
const RINGS = [20, 40, 60, 80, 100];

function pointOnAxis(index: number, valuePct: number) {
  const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
  const r = (valuePct / 100) * RADIUS;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
}

export function TrailSpiderChart({
  scores,
  className,
}: {
  scores: Record<TrailValueKey, number>;
  className?: string;
}) {
  const points = AXES.map((a, i) => pointOnAxis(i, scores[a.key]));
  const path = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={className}
      role="img"
      aria-label="Perfil TRAIL — 6 eixos TRILHA"
    >
      {/* Rings */}
      {RINGS.map((r) => (
        <polygon
          key={r}
          points={AXES.map((_, i) => {
            const p = pointOnAxis(i, r);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={1}
        />
      ))}
      {/* Axes */}
      {AXES.map((_, i) => {
        const end = pointOnAxis(i, 100);
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={end.x}
            y2={end.y}
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth={1}
          />
        );
      })}
      {/* Data polygon */}
      <polygon
        points={path}
        fill="rgba(168,230,226,0.35)"
        stroke="#0E2A44"
        strokeWidth={2}
      />
      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="#0E2A44"
          stroke="#fff"
          strokeWidth={2}
        />
      ))}
      {/* Labels */}
      {AXES.map((a, i) => {
        const label = pointOnAxis(i, 118);
        return (
          <text
            key={a.key}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fontWeight={600}
            fill="currentColor"
          >
            {a.label}
          </text>
        );
      })}
      {/* Score labels near points */}
      {points.map((p, i) => (
        <text
          key={`s-${i}`}
          x={p.x}
          y={p.y - 10}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fill="#0E2A44"
        >
          {scores[AXES[i].key]}
        </text>
      ))}
    </svg>
  );
}
