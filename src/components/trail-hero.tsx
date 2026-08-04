/**
 * Hero gerado por código para caminhadas sem fotografia própria.
 *
 * Desenha um mapa topográfico: curvas de nível concêntricas de uma mesma
 * "colina", geradas de forma determinística a partir de uma semente (o slug do
 * evento ou a ref do trilho). A mesma semente dá sempre o mesmo desenho, e
 * sementes diferentes dão desenhos claramente diferentes.
 *
 * Existe porque é mais honesto do que pôr a fotografia de outro sítio na
 * página de uma caminhada. Um percurso só leva foto quando for nossa, tirada
 * no terreno. Até lá, leva isto.
 *
 * NOTA: este ficheiro é espelhado em web/src/components/trail-hero.tsx.
 * O site é standalone e não partilha packages com o monorepo, por isso a cópia
 * é deliberada. Se mexeres num, mexe no outro.
 */

type Props = {
  /** Slug do evento ou ref do trilho. Determina o desenho. */
  seed: string;
  /** Canto inferior esquerdo, ex. "PR4 PMS · 13,2 km". Opcional. */
  label?: string;
  className?: string;
};

/** Hash estável de string para inteiro de 32 bits. */
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG determinístico (mulberry32). */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 800;
const H = 500;

/**
 * Uma curva de nível. As harmónicas são partilhadas por todas as curvas do
 * mesmo relevo, que é o que as faz parecer encaixadas umas nas outras em vez
 * de manchas aleatórias.
 */
function contour(
  cx: number,
  cy: number,
  r: number,
  harm: { amp: number; freq: number; phase: number }[],
): string {
  const steps = 96;
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    let k = 1;
    for (const h of harm) k += h.amp * Math.sin(h.freq * a + h.phase);
    const x = cx + Math.cos(a) * r * k;
    // Achatado na vertical: as curvas ficam com proporção de mapa, não de bola.
    const y = cy + Math.sin(a) * r * k * 0.62;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

export function TrailHero({ seed, label, className }: Props) {
  const rand = rng(hashSeed(seed));

  // Tom dentro da família do ciano da marca. Varia com a semente para duas
  // caminhadas seguidas não parecerem a mesma página.
  const hue = 158 + Math.floor(rand() * 38);
  const accent = `hsl(${hue} 55% 72%)`;
  const accentSoft = `hsl(${hue} 45% 60%)`;

  const relevos = [
    {
      cx: W * (0.28 + rand() * 0.2),
      cy: H * (0.42 + rand() * 0.2),
      base: 26 + rand() * 14,
      step: 21 + rand() * 9,
      aneis: 9,
    },
    {
      cx: W * (0.68 + rand() * 0.2),
      cy: H * (0.24 + rand() * 0.3),
      base: 18 + rand() * 10,
      step: 17 + rand() * 8,
      aneis: 6,
    },
  ].map((r) => ({
    ...r,
    harm: [
      { amp: 0.15 + rand() * 0.1, freq: 3, phase: rand() * Math.PI * 2 },
      { amp: 0.08 + rand() * 0.07, freq: 5, phase: rand() * Math.PI * 2 },
      { amp: 0.04 + rand() * 0.04, freq: 7, phase: rand() * Math.PI * 2 },
    ],
  }));

  const gid = `th-${hashSeed(seed).toString(36)}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Mapa topográfico ilustrativo"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#0E2A44" />
          <stop offset="100%" stopColor="#173a5b" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#${gid})`} />

      {relevos.map((relevo, ri) =>
        Array.from({ length: relevo.aneis }, (_, i) => {
          const r = relevo.base + i * relevo.step;
          // Anéis exteriores mais esbatidos: dá profundidade sem sujar.
          const o = 0.5 - (i / relevo.aneis) * 0.34;
          return (
            <path
              key={`${ri}-${i}`}
              d={contour(relevo.cx, relevo.cy, r, relevo.harm)}
              fill="none"
              stroke={i === 0 ? accent : accentSoft}
              strokeWidth={i === 0 ? 2.4 : 1.3}
              opacity={i === 0 ? 0.85 : o}
            />
          );
        }),
      )}

      {label && (
        <text
          x={28}
          y={H - 26}
          fill={accent}
          opacity={0.9}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize={22}
          letterSpacing={1.5}
        >
          {label}
        </text>
      )}
    </svg>
  );
}
