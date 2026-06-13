import React from 'react';
import Svg, { Circle, Defs, Path, RadialGradient, Stop, LinearGradient } from 'react-native-svg';

interface Props {
  size?: number;
}

/** A glowing golden comet with a swept tail. */
export function CometArt({ size = 52 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Defs>
        <RadialGradient id="cometHead" cx="68%" cy="32%" r="60%">
          <Stop offset="0%" stopColor="#FFFDF0" />
          <Stop offset="45%" stopColor="#FACC15" />
          <Stop offset="100%" stopColor="#E0890B" />
        </RadialGradient>
        <LinearGradient id="cometTail" x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#FACC15" stopOpacity={0} />
          <Stop offset="100%" stopColor="#FFE9A8" stopOpacity={0.9} />
        </LinearGradient>
      </Defs>

      {/* Tail */}
      <Path d="M6 46 C 20 40, 30 30, 36 18 L 40 24 C 34 34, 24 42, 10 49 Z" fill="url(#cometTail)" />
      <Path d="M12 44 C 22 38, 30 30, 35 22" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} fill="none" />

      {/* Outer glow */}
      <Circle cx={36} cy={16} r={15} fill="#FACC15" opacity={0.22} />
      {/* Head */}
      <Circle cx={36} cy={16} r={9.5} fill="url(#cometHead)" />
      <Circle cx={33} cy={13} r={3} fill="#FFFFFF" opacity={0.85} />
    </Svg>
  );
}
