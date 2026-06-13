import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { colors } from '../../theme';

export type IconName =
  // currency
  | 'mineral'
  | 'darkmatter'
  // tabs
  | 'mine'
  | 'empire'
  | 'fleet'
  | 'prestige'
  | 'goals'
  | 'lab'
  // ui
  | 'settings'
  | 'sound'
  | 'muted'
  | 'check'
  | 'lock'
  | 'stats'
  // generators
  | 'drone'
  | 'excavator'
  | 'refinery'
  | 'hauler'
  | 'station'
  | 'harvester'
  | 'cracker'
  | 'dyson'
  // dark matter shop
  | 'stellar_density'
  | 'kinetic_amplifier'
  | 'cosmic_magnet'
  | 'warp_logistics'
  | 'belt_resonance'
  | 'quantum_reserves'
  | 'temporal_vault'
  | 'dark_compression'
  // expeditions
  | 'scout'
  | 'survey'
  | 'salvage'
  // misc
  | 'artifact'
  | 'gem_outline'
  | 'shard'
  | 'burst';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  accent?: string;
}

function starPoints(cx: number, cy: number, outer: number, inner: number, n = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

export function Icon({ name, size = 24, color, accent }: Props) {
  const c = color ?? colors.text;
  const a = accent ?? colors.accent;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {glyph(name, c, a)}
    </Svg>
  );
}

function glyph(name: IconName, c: string, a: string): React.ReactElement {
  switch (name) {
    case 'mineral':
      return (
        <G>
          <Polygon points="12,2 20,9 12,22 4,9" fill={a} />
          <Polygon points="12,2 20,9 12,9" fill="#FFFFFF" opacity={0.35} />
          <Polyline points="4,9 20,9" stroke="#0B0E1A" strokeWidth={0.8} opacity={0.4} />
          <Polyline points="12,9 12,22" stroke="#0B0E1A" strokeWidth={0.8} opacity={0.4} />
        </G>
      );
    case 'darkmatter':
      return (
        <G>
          <Circle cx={12} cy={12} r={9} fill={colors.darkMatter} />
          <Path d="M12 4 a8 8 0 0 1 0 16 a5 5 0 0 0 0 -16 Z" fill="#0B0E1A" opacity={0.55} />
          <Circle cx={9} cy={9} r={1.6} fill="#FFFFFF" opacity={0.85} />
        </G>
      );
    case 'mine':
      return (
        <G stroke={c} strokeWidth={2} fill="none" strokeLinecap="round">
          <Path d="M4 7 C 9 4, 15 4, 20 7" />
          <Line x1={12} y1={6} x2={12} y2={21} />
        </G>
      );
    case 'empire':
      return (
        <G fill={c}>
          <Rect x={3} y={11} width={18} height={9} rx={1} />
          <Polygon points="3,11 9,11 6,7" />
          <Rect x={11} y={5} width={3} height={6} fill={a} />
          <Rect x={16} y={3} width={3} height={8} fill={a} />
        </G>
      );
    case 'fleet':
    case 'scout':
      return (
        <G>
          <Path d="M12 2 C 16 6, 16 12, 14 16 L 10 16 C 8 12, 8 6, 12 2 Z" fill={c} />
          <Circle cx={12} cy={9} r={2} fill={colors.background} />
          <Polygon points="10,15 7,19 10,18" fill={a} />
          <Polygon points="14,15 17,19 14,18" fill={a} />
          <Polygon points="11,17 12,21 13,17" fill="#FACC15" />
        </G>
      );
    case 'prestige':
      return (
        <G>
          <Polygon points={starPoints(12, 12, 10, 3, 4)} fill={colors.darkMatter} />
          <Polygon points={starPoints(12, 12, 6, 2, 4)} fill="#FFFFFF" opacity={0.5} />
          <Circle cx={12} cy={12} r={2.5} fill="#FFFFFF" />
        </G>
      );
    case 'drone':
      return (
        <G fill={c}>
          <Polygon points="12,7 16,12 12,17 8,12" />
          <Circle cx={6} cy={8} r={2.4} fill={a} />
          <Circle cx={18} cy={8} r={2.4} fill={a} />
          <Circle cx={6} cy={16} r={2.4} fill={a} />
          <Circle cx={18} cy={16} r={2.4} fill={a} />
        </G>
      );
    case 'excavator':
      return (
        <G fill={c}>
          <Rect x={3} y={13} width={10} height={6} rx={1} />
          <Path d="M12 14 L 19 8" stroke={c} strokeWidth={2} strokeLinecap="round" />
          <Path d="M17 5 a4 4 0 0 1 4 4 L 16 9 Z" fill={a} />
          <Circle cx={6} cy={20} r={1.6} fill={a} />
          <Circle cx={11} cy={20} r={1.6} fill={a} />
        </G>
      );
    case 'refinery':
      return (
        <G fill={c}>
          <Rect x={6} y={9} width={8} height={12} rx={1} />
          <Rect x={15} y={12} width={4} height={9} rx={1} fill={a} />
          <Path d="M6 9 a4 4 0 0 1 8 0 Z" fill={a} />
          <Line x1={6} y1={14} x2={14} y2={14} stroke={colors.background} strokeWidth={1.2} />
          <Line x1={6} y1={17} x2={14} y2={17} stroke={colors.background} strokeWidth={1.2} />
        </G>
      );
    case 'hauler':
    case 'salvage':
      return (
        <G>
          <Path d="M3 13 L 18 11 C 21 11, 21 14, 18 15 L 5 16 Z" fill={c} />
          <Polygon points="18,11 22,12.5 18,15" fill={a} />
          <Circle cx={8} cy={13.4} r={1} fill={colors.background} />
          <Circle cx={12} cy={13} r={1} fill={colors.background} />
          <Polygon points="6,16 8,20 11,16" fill={a} opacity={0.8} />
        </G>
      );
    case 'station':
      return (
        <G fill="none" stroke={c} strokeWidth={2}>
          <Circle cx={12} cy={12} r={8} />
          <Circle cx={12} cy={12} r={3} fill={a} stroke="none" />
          <Line x1={12} y1={4} x2={12} y2={9} />
          <Line x1={12} y1={15} x2={12} y2={20} />
          <Line x1={4} y1={12} x2={9} y2={12} />
          <Line x1={15} y1={12} x2={20} y2={12} />
        </G>
      );
    case 'harvester':
      return (
        <G>
          <Path d="M5 6 A 9 9 0 1 0 5 18 A 6 6 0 1 1 5 6 Z" fill={c} />
          <Circle cx={16} cy={8} r={1.5} fill={a} />
          <Circle cx={19} cy={12} r={1.5} fill={a} />
          <Circle cx={16} cy={16} r={1.5} fill={a} />
        </G>
      );
    case 'cracker':
      return (
        <G>
          <Circle cx={12} cy={12} r={9} fill={c} />
          <Polyline
            points="12,3 10,8 14,12 9,16 12,21"
            fill="none"
            stroke="#FACC15"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Circle cx={12} cy={12} r={9} fill="none" stroke={a} strokeWidth={1.5} opacity={0.5} />
        </G>
      );
    case 'dyson':
    case 'stellar_density':
      return (
        <G>
          <Circle cx={12} cy={12} r={5} fill="#FACC15" />
          <Polygon points={starPoints(12, 12, 11, 6, 8)} fill="#FACC15" opacity={0.35} />
          <Circle cx={12} cy={12} r={5} fill="none" stroke="#FFE9A8" strokeWidth={1} />
        </G>
      );
    case 'kinetic_amplifier':
      return (
        <G fill={c}>
          <Rect x={6} y={4} width={12} height={5} rx={1.5} transform="rotate(35 12 6)" fill={a} />
          <Rect x={10} y={8} width={3} height={12} rx={1.5} transform="rotate(35 12 14)" />
        </G>
      );
    case 'cosmic_magnet':
      return (
        <G fill="none" stroke={a} strokeWidth={3.2} strokeLinecap="round">
          <Path d="M6 18 L 6 11 A 6 6 0 0 1 18 11 L 18 18" />
          <Line x1={6} y1={18} x2={6} y2={20} stroke={c} />
          <Line x1={18} y1={18} x2={18} y2={20} stroke={c} />
        </G>
      );
    case 'warp_logistics':
      return (
        <G fill={a}>
          <Polygon points="4,6 12,12 4,18" />
          <Polygon points="12,6 20,12 12,18" opacity={0.6} />
        </G>
      );
    case 'belt_resonance':
      return (
        <G fill="none" stroke={a} strokeWidth={2}>
          <Circle cx={12} cy={12} r={3} fill={a} stroke="none" />
          <Path d="M5 12 A 7 7 0 0 1 19 12" opacity={0.8} />
          <Path d="M3 12 A 9 9 0 0 1 21 12" opacity={0.45} />
        </G>
      );
    case 'quantum_reserves':
      return (
        <G>
          <Rect x={4} y={5} width={16} height={14} rx={2} fill={c} />
          <Circle cx={12} cy={12} r={4} fill="none" stroke={a} strokeWidth={2} />
          <Line x1={12} y1={12} x2={15} y2={9} stroke={a} strokeWidth={2} strokeLinecap="round" />
          <Line x1={6} y1={19} x2={6} y2={21} stroke={c} strokeWidth={2} />
          <Line x1={18} y1={19} x2={18} y2={21} stroke={c} strokeWidth={2} />
        </G>
      );
    case 'temporal_vault':
      return (
        <G fill={c}>
          <Polygon points="6,4 18,4 12,12" fill={a} />
          <Polygon points="12,12 18,20 6,20" />
          <Line x1={5} y1={4} x2={19} y2={4} stroke={c} strokeWidth={2} strokeLinecap="round" />
          <Line x1={5} y1={20} x2={19} y2={20} stroke={c} strokeWidth={2} strokeLinecap="round" />
        </G>
      );
    case 'dark_compression':
      return (
        <G>
          <Circle cx={12} cy={12} r={9} fill="none" stroke={colors.darkMatter} strokeWidth={2.5} />
          <Circle cx={12} cy={12} r={5} fill="#0B0E1A" />
          <Circle cx={12} cy={12} r={5} fill="none" stroke={a} strokeWidth={1} opacity={0.6} />
        </G>
      );
    case 'survey':
      return (
        <G>
          <Circle cx={11} cy={10} r={6} fill="none" stroke={c} strokeWidth={2} />
          <Line x1={11} y1={5} x2={11} y2={15} stroke={a} strokeWidth={1.5} />
          <Line x1={6} y1={10} x2={16} y2={10} stroke={a} strokeWidth={1.5} />
          <Line x1={15} y1={14} x2={20} y2={20} stroke={c} strokeWidth={2.5} strokeLinecap="round" />
        </G>
      );
    case 'artifact':
      return (
        <G>
          <Polygon points="12,2 19,7 16,20 8,20 5,7" fill={c} />
          <Polygon points="12,2 19,7 12,9 5,7" fill="#FFFFFF" opacity={0.3} />
          <Polyline points="5,7 12,9 19,7" stroke={colors.background} strokeWidth={0.8} opacity={0.5} fill="none" />
          <Polyline points="12,9 12,20" stroke={colors.background} strokeWidth={0.8} opacity={0.5} fill="none" />
        </G>
      );
    case 'gem_outline':
      return (
        <G fill="none" stroke={c} strokeWidth={1.6} opacity={0.6}>
          <Polygon points="12,3 18,7.5 15.5,19 8.5,19 6,7.5" />
        </G>
      );
    case 'goals':
      return (
        <G>
          <Path d="M7 4 H17 V9 A5 5 0 0 1 7 9 Z" fill="#FACC15" />
          <Path d="M7 5 H4 V7 A3 3 0 0 0 7 10" fill="none" stroke="#FACC15" strokeWidth={1.6} />
          <Path d="M17 5 H20 V7 A3 3 0 0 1 17 10" fill="none" stroke="#FACC15" strokeWidth={1.6} />
          <Rect x={10.5} y={13} width={3} height={4} fill="#FACC15" />
          <Rect x={7} y={17} width={10} height={3} rx={1} fill="#FACC15" />
        </G>
      );
    case 'lab':
      return (
        <G>
          <Circle cx={12} cy={12} r={2.4} fill={a} />
          <G fill="none" stroke={c} strokeWidth={1.8}>
            <Ellipse cx={12} cy={12} rx={9} ry={4} />
            <Ellipse cx={12} cy={12} rx={9} ry={4} transform="rotate(60 12 12)" />
            <Ellipse cx={12} cy={12} rx={9} ry={4} transform="rotate(120 12 12)" />
          </G>
        </G>
      );
    case 'settings':
      return (
        <G fill="none" stroke={c} strokeWidth={2}>
          <Circle cx={12} cy={12} r={3.2} />
          <Path d="M12 3 V6 M12 18 V21 M3 12 H6 M18 12 H21 M5.6 5.6 L7.7 7.7 M16.3 16.3 L18.4 18.4 M18.4 5.6 L16.3 7.7 M7.7 16.3 L5.6 18.4" strokeLinecap="round" />
        </G>
      );
    case 'sound':
      return (
        <G>
          <Polygon points="4,9 8,9 12,5 12,19 8,15 4,15" fill={c} />
          <Path d="M15 9 A4 4 0 0 1 15 15" fill="none" stroke={a} strokeWidth={2} strokeLinecap="round" />
          <Path d="M17 6 A8 8 0 0 1 17 18" fill="none" stroke={a} strokeWidth={2} strokeLinecap="round" />
        </G>
      );
    case 'muted':
      return (
        <G>
          <Polygon points="4,9 8,9 12,5 12,19 8,15 4,15" fill={c} />
          <Line x1={15} y1={9} x2={21} y2={15} stroke={colors.danger} strokeWidth={2} strokeLinecap="round" />
          <Line x1={21} y1={9} x2={15} y2={15} stroke={colors.danger} strokeWidth={2} strokeLinecap="round" />
        </G>
      );
    case 'check':
      return (
        <Polyline points="5,13 10,18 19,6" fill="none" stroke={a} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      );
    case 'lock':
      return (
        <G>
          <Rect x={6} y={11} width={12} height={9} rx={1.5} fill={c} />
          <Path d="M8 11 V8 A4 4 0 0 1 16 8 V11" fill="none" stroke={c} strokeWidth={2} />
        </G>
      );
    case 'stats':
      return (
        <G fill={c}>
          <Rect x={4} y={13} width={4} height={7} rx={1} />
          <Rect x={10} y={8} width={4} height={12} rx={1} fill={a} />
          <Rect x={16} y={4} width={4} height={16} rx={1} />
        </G>
      );
    case 'shard':
      return <Polygon points="12,3 16,14 12,21 8,14" fill={a} />;
    case 'burst':
      return (
        <G fill="#FACC15">
          <Polygon points={starPoints(12, 12, 11, 4, 6)} />
          <Circle cx={12} cy={12} r={3} fill="#FFF4C2" />
        </G>
      );
  }
}
