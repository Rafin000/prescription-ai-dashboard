interface VitalsMiniChartProps {
  points: number[];
  tone?: 'accent' | 'warn' | 'danger' | 'success';
  width?: number;
  height?: number;
}

const strokeMap: Record<string, string> = {
  accent: '#0F766E',
  warn: '#B45309',
  danger: '#B91C1C',
  success: '#15803D',
};

const fillMap: Record<string, string> = {
  accent: 'url(#v-accent)',
  warn: 'url(#v-warn)',
  danger: 'url(#v-danger)',
  success: 'url(#v-success)',
};

export function VitalsMiniChart({
  points,
  tone = 'accent',
  width = 240,
  height = 68,
}: VitalsMiniChartProps) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padY = 6;
  const w = width;
  const h = height;
  const step = (w - 8) / (points.length - 1);

  const coords = points.map((v, i) => {
    const x = 4 + i * step;
    const y = padY + (1 - (v - min) / range) * (h - padY * 2);
    return [x, y] as const;
  });
  const d = coords
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(' ');
  const area = `${d} L ${coords[coords.length - 1][0]} ${h} L ${coords[0][0]} ${h} Z`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="v-accent" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0F766E" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0F766E" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="v-warn" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#B45309" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#B45309" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="v-danger" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#B91C1C" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#B91C1C" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="v-success" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#15803D" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#15803D" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={fillMap[tone]} />
      <path
        d={d}
        fill="none"
        stroke={strokeMap[tone]}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.slice(-1).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={strokeMap[tone]} />
      ))}
    </svg>
  );
}
