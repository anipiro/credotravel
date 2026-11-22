import Link from "next/link";
import { ATOLLS, RESORTS } from "@/lib/supplier";

/**
 * The destination picker drawn as a sea chart. Each atoll is a ring of
 * islets and a link that filters the resort list.
 */

const LAYOUT: Record<string, { x: number; y: number; rx: number; ry: number; turn: number; labelX: number; labelY: number }> = {
  sunaru: { x: 300, y: 120, rx: 74, ry: 52, turn: -18, labelX: 300, labelY: 212 },
  kelavaru: { x: 168, y: 300, rx: 62, ry: 86, turn: 12, labelX: 168, labelY: 424 },
  mirihandu: { x: 344, y: 452, rx: 80, ry: 46, turn: 8, labelX: 344, labelY: 538 },
};

function islets(id: string, rx: number, ry: number): { x: number; y: number; w: number; h: number; a: number }[] {
  // A fixed pattern per atoll so server and client agree.
  let state = id.length * 7919 + id.charCodeAt(0) * 31;
  const rand = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const count = 13;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.2;
    const gap = rand() < 0.16;
    return {
      x: Math.round(Math.cos(angle) * rx * 10) / 10,
      y: Math.round(Math.sin(angle) * ry * 10) / 10,
      w: gap ? 0 : Math.round((5 + rand() * 9) * 10) / 10,
      h: Math.round((3 + rand() * 3) * 10) / 10,
      a: Math.round((angle * 180) / Math.PI + 90),
    };
  }).filter((islet) => islet.w > 0);
}

export function AtollChart({ selected, query }: { selected: string; query: string }) {
  return (
    <svg className="chart" viewBox="0 0 500 580" role="group" aria-label="Chart of the three atolls. Choose one to filter the resort list.">
      <rect width="500" height="580" fill="#0F5468" />
      <g stroke="#fff" strokeOpacity="0.14" strokeWidth="1">
        {[100, 200, 300, 400].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="580" />
        ))}
        {[116, 232, 348, 464].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="500" y2={y} />
        ))}
      </g>
      <g className="chart-tick">
        <text x="8" y="112">4°N</text>
        <text x="8" y="228">3°N</text>
        <text x="8" y="344">2°N</text>
        <text x="8" y="460">1°N</text>
        <text x="104" y="572">72°E</text>
        <text x="304" y="572">74°E</text>
      </g>

      <g transform="translate(70 96)" aria-hidden="true">
        <circle r="30" fill="none" stroke="#fff" strokeOpacity="0.35" />
        <path d="M0 -40 L5 0 L0 40 L-5 0Z" fill="#fff" fillOpacity="0.8" />
        <path d="M-26 0 L0 -4 L26 0 L0 4Z" fill="#fff" fillOpacity="0.4" />
        <text y="-46" textAnchor="middle" className="chart-north">N</text>
      </g>

      {ATOLLS.map((atoll) => {
        const place = LAYOUT[atoll.id];
        const isSelected = selected === atoll.id;
        const count = RESORTS.filter((resort) => resort.atollId === atoll.id).length;
        return (
          <Link
            key={atoll.id}
            href={`/?atoll=${atoll.id}&${query}#resorts`}
            className={isSelected ? "chart-atoll is-selected" : "chart-atoll"}
            aria-label={`${atoll.name}, ${count} resorts${isSelected ? ", selected" : ""}`}
            aria-current={isSelected ? "true" : undefined}
            scroll={false}
          >
            <g transform={`translate(${place.x} ${place.y}) rotate(${place.turn})`}>
              <ellipse className="chart-hit" rx={place.rx + 26} ry={place.ry + 26} />
              <ellipse className="chart-shelf" rx={place.rx + 9} ry={place.ry + 9} />
              <ellipse className="chart-lagoon" rx={place.rx - 6} ry={place.ry - 6} />
              {islets(atoll.id, place.rx, place.ry).map((islet, i) => (
                <ellipse key={i} className="chart-islet" cx={islet.x} cy={islet.y} rx={islet.w} ry={islet.h} transform={`rotate(${islet.a} ${islet.x} ${islet.y})`} />
              ))}
            </g>
            <text x={place.labelX} y={place.labelY} textAnchor="middle" className="chart-label">
              {atoll.name}
            </text>
          </Link>
        );
      })}
    </svg>
  );
}
