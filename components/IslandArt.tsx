/**
 * A chart-style drawing of an island seen from above: reef shelf, lagoon,
 * sand, vegetation, a jetty with villas and a few depth soundings. The shape
 * is generated from a seed, so each resort has its own island and no
 * photographs are needed.
 */

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** A closed smooth path through points, using Catmull-Rom converted to Bezier. */
function smoothPath(points: [number, number][]): string {
  const n = points.length;
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return `${d}Z`;
}

export function IslandArt({ seed, label }: { seed: number; label: string }) {
  const rand = seeded(seed);
  const W = 400;
  const H = 280;
  const cx = W / 2 + (rand() - 0.5) * 40;
  const cy = H / 2 + (rand() - 0.5) * 24;
  const tilt = rand() * Math.PI;
  const stretch = 1.35 + rand() * 0.5;
  const count = 10;
  const radii = Array.from({ length: count }, () => 0.78 + rand() * 0.34);

  const ring = (size: number, wobble = 1): [number, number][] =>
    radii.map((radius, i) => {
      const angle = (i / count) * Math.PI * 2;
      const r = size * (1 + (radius - 1) * wobble);
      const x = Math.cos(angle) * r * stretch;
      const y = Math.sin(angle) * r;
      return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)];
    });

  // Jetty: from the sand out across the lagoon, villas on alternate sides.
  const jettyAngle = tilt + Math.PI / 2 + (rand() - 0.5) * 0.5;
  const jx = Math.cos(jettyAngle);
  const jy = Math.sin(jettyAngle);
  const jettyStart = 42;
  const jettyLength = 50 + rand() * 14;
  const villas = Array.from({ length: 6 }, (_, i) => {
    const along = jettyStart + 14 + i * 8;
    const side = i % 2 === 0 ? 1 : -1;
    return { x: cx + jx * along - jy * 6 * side, y: cy + jy * along + jx * 6 * side };
  }).filter((_, i) => 14 + i * 8 < jettyLength);

  const soundings = Array.from({ length: 7 }, () => {
    const angle = rand() * Math.PI * 2;
    const distance = 128 + rand() * 60;
    return {
      x: cx + Math.cos(angle) * distance * 1.3,
      y: cy + Math.sin(angle) * distance * 0.8,
      depth: 12 + Math.floor(rand() * 48),
    };
  }).filter((s) => s.x > 14 && s.x < W - 20 && s.y > 16 && s.y < H - 10);

  return (
    <svg className="island-art" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
      <rect width={W} height={H} fill="#0F5468" />
      <path d={smoothPath(ring(104, 0.7))} fill="#167A8B" />
      <path d={smoothPath(ring(88, 0.8))} fill="#27A9A6" />
      <path d={smoothPath(ring(70, 0.9))} fill="#7FD9CC" />
      <path d={smoothPath(ring(70, 0.9))} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="2 4" />
      <path d={smoothPath(ring(46))} fill="#F6E6BE" />
      <path d={smoothPath(ring(33, 1.25))} fill="#2E8562" />
      <path d={smoothPath(ring(20, 1.5))} fill="#236B4E" />
      <line
        x1={r1(cx + jx * jettyStart)}
        y1={r1(cy + jy * jettyStart)}
        x2={r1(cx + jx * (jettyStart + jettyLength))}
        y2={r1(cy + jy * (jettyStart + jettyLength))}
        stroke="#F6E6BE"
        strokeWidth="2"
      />
      {villas.map((villa, i) => (
        <rect
          key={i}
          x={r1(villa.x - 3)}
          y={r1(villa.y - 3)}
          width="6"
          height="6"
          fill="#FFB42E"
          transform={`rotate(${r1((jettyAngle * 180) / Math.PI)} ${r1(villa.x)} ${r1(villa.y)})`}
        />
      ))}
      {soundings.map((s, i) => (
        <text key={i} x={r1(s.x)} y={r1(s.y)} className="island-art-sounding">
          {s.depth}
        </text>
      ))}
    </svg>
  );
}
