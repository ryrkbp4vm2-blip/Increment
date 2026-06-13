import React from 'react';
import Svg, {
  Defs,
  Ellipse,
  G,
  Polygon,
  Polyline,
  RadialGradient,
  Stop,
} from 'react-native-svg';

type Style = 'cratered' | 'faceted' | 'icy';

interface Palette {
  light: string;
  base: string;
  dark: string;
  rim: string;
  style: Style;
}

// One palette per cycling belt type (see asteroids.ts ASTEROID_TYPES order).
const PALETTES: Palette[] = [
  { light: '#9AA3B5', base: '#6B7280', dark: '#3B4252', rim: '#C7CEDB', style: 'cratered' }, // Rocky
  { light: '#D6F3FF', base: '#8AD3F0', dark: '#3E7FA6', rim: '#FFFFFF', style: 'icy' }, // Glacial
  { light: '#D6925A', base: '#A65B33', dark: '#5C2E1C', rim: '#F0B98A', style: 'cratered' }, // Ferrous
  { light: '#FFE08A', base: '#F4C04A', dark: '#9A6B18', rim: '#FFF4C2', style: 'faceted' }, // Auric
  { light: '#8EF0E2', base: '#3FD3C0', dark: '#1C7E74', rim: '#D6FFF8', style: 'faceted' }, // Crystalline
  { light: '#C79CF7', base: '#8B5CF6', dark: '#4A2A8A', rim: '#E6D2FF', style: 'faceted' }, // Voidstone
];

/** Stable irregular silhouette so the asteroid keeps a consistent shape. */
const RADII = [1, 0.9, 1.06, 0.85, 0.98, 0.88, 1.04, 0.83, 1.0, 0.91, 1.07, 0.87];

function silhouette(cx: number, cy: number, r: number): string {
  return RADII.map((f, i) => {
    const a = (i / RADII.length) * Math.PI * 2 - Math.PI / 2;
    return `${(cx + Math.cos(a) * r * f).toFixed(1)},${(cy + Math.sin(a) * r * f).toFixed(1)}`;
  }).join(' ');
}

const BOSS_PALETTE: Palette = {
  light: '#FF8A6B',
  base: '#C42B2B',
  dark: '#5A1414',
  rim: '#FFD0B0',
  style: 'faceted',
};

interface Props {
  /** Belt type index (cycles through palettes). */
  typeIndex: number;
  size?: number;
  boss?: boolean;
}

export function AsteroidArt({ typeIndex, size = 200, boss = false }: Props) {
  const p = boss ? BOSS_PALETTE : PALETTES[typeIndex % PALETTES.length];
  const cx = 100;
  const cy = 100;
  const poly = silhouette(cx, cy, 78);
  const id = boss ? 'astBoss' : `ast${typeIndex % PALETTES.length}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id={id} cx="38%" cy="32%" r="80%">
          <Stop offset="0%" stopColor={p.light} />
          <Stop offset="55%" stopColor={p.base} />
          <Stop offset="100%" stopColor={p.dark} />
        </RadialGradient>
      </Defs>

      {/* Soft glow halo (an angrier ring for bosses) */}
      <Polygon points={silhouette(cx, cy, 90)} fill={p.base} opacity={boss ? 0.32 : 0.18} />
      {boss && <Polygon points={silhouette(cx, cy, 96)} fill="#FF3B3B" opacity={0.14} />}

      {/* Body */}
      <Polygon points={poly} fill={`url(#${id})`} stroke={p.dark} strokeWidth={2} />

      {/* Rim highlight on the lit edge */}
      <Polyline
        points={silhouette(cx, cy, 78).split(' ').slice(0, 5).join(' ')}
        fill="none"
        stroke={p.rim}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.8}
      />

      {p.style === 'cratered' && (
        <G opacity={0.55}>
          <Ellipse cx={86} cy={92} rx={16} ry={12} fill={p.dark} />
          <Ellipse cx={88} cy={90} rx={13} ry={9} fill={p.base} />
          <Ellipse cx={120} cy={120} rx={11} ry={9} fill={p.dark} />
          <Ellipse cx={115} cy={70} rx={8} ry={6} fill={p.dark} />
        </G>
      )}

      {p.style === 'faceted' && (
        <G opacity={0.5} stroke={p.rim} strokeWidth={1.5} fill="none">
          <Polyline points={`${cx},${cy} 70,60`} />
          <Polyline points={`${cx},${cy} 140,78`} />
          <Polyline points={`${cx},${cy} 132,140`} />
          <Polyline points={`${cx},${cy} 74,138`} />
          <Polyline points={`${cx},${cy} 60,98`} />
          <Polygon points={`${cx},${cy} 70,60 140,78`} fill={p.light} opacity={0.25} stroke="none" />
          <Polygon points={`${cx},${cy} 132,140 74,138`} fill={p.dark} opacity={0.3} stroke="none" />
        </G>
      )}

      {p.style === 'icy' && (
        <G opacity={0.7}>
          <Polyline points="78,72 96,96 120,84" fill="none" stroke={p.rim} strokeWidth={2.5} strokeLinecap="round" />
          <Polyline points="92,128 108,108" fill="none" stroke={p.rim} strokeWidth={2.5} strokeLinecap="round" />
          <Ellipse cx={118} cy={120} rx={9} ry={7} fill={p.light} opacity={0.5} />
        </G>
      )}
    </Svg>
  );
}
