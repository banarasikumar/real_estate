import React from 'react';
import Svg, { Path, Circle, Line } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/**
 * Zillow Drawing Icon: Hand with extended pointing index finger
 * drawing a curved continuous loop around the fingertip.
 */
export const ZillowDrawIcon: React.FC<IconProps> = ({
  size = 22,
  color = '#0f172a',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Drawn loop around the fingertip */}
      <Path
        d="M 5.5 8.5 C 5.5 4.8 9.5 3 14 3.8 C 18 4.5 20.5 8 19 11.5 C 17.5 14.5 13.5 14.5 12 12"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Hand with pointing index finger */}
      <Path
        d="M 12 5.5 C 12 4.4 12.8 3.5 13.9 3.5 C 15 3.5 15.8 4.4 15.8 5.5 V 11.5 C 15.8 11.8 16.1 12 16.4 12 C 17.1 12 17.6 11.4 17.6 10.7 V 10 C 17.6 9.4 18.1 9 18.7 9 C 19.3 9 19.8 9.5 19.8 10.1 V 12 C 19.8 12.5 20.2 13 20.7 13 C 21.2 13 21.6 12.6 21.6 12.1 V 11.5 C 21.6 11 22 10.6 22.5 10.6 C 23 10.6 23.4 11 23.4 11.5 V 15.5 C 23.4 19 20.5 21.5 17 21.5 H 14.5 C 12.2 21.5 10.2 20.1 9.4 18 L 8 14.5 C 7.6 13.6 8 12.6 9 12.2 C 9.8 11.9 10.7 12.2 11.2 13 L 12 14.2 V 5.5 Z"
        transform="scale(0.8) translate(-1, 2)"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

/**
 * Zillow Filter Icon: 3 vertical equalizer slider tracks with offset adjustment knobs.
 * (Matching Zillow screenshot 1 & 2)
 */
export const ZillowFilterIcon: React.FC<IconProps> = ({
  size = 20,
  color = '#0f172a',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Track 1 (Left): Knob near top (y=8) */}
      <Line
        x1={6}
        y1={3.5}
        x2={6}
        y2={20.5}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle
        cx={6}
        cy={8.5}
        r={2.8}
        fill="#ffffff"
        stroke={color}
        strokeWidth={2}
      />

      {/* Track 2 (Center): Knob near bottom (y=15.5) */}
      <Line
        x1={12}
        y1={3.5}
        x2={12}
        y2={20.5}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle
        cx={12}
        cy={15.5}
        r={2.8}
        fill="#ffffff"
        stroke={color}
        strokeWidth={2}
      />

      {/* Track 3 (Right): Knob near middle-top (y=11) */}
      <Line
        x1={18}
        y1={3.5}
        x2={18}
        y2={20.5}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle
        cx={18}
        cy={11}
        r={2.8}
        fill="#ffffff"
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
};
