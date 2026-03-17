'use client';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeConfig: Record<SpinnerSize, { box: number; stroke: number; r: number }> = {
  sm: { box: 20, stroke: 2, r: 7 },
  md: { box: 32, stroke: 2, r: 12 },
  lg: { box: 48, stroke: 2.5, r: 18 },
};

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const { box, stroke, r } = sizeConfig[size];
  const center = box / 2;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * 0.28;
  const gap = circumference - arc;

  const innerR = r * 0.58;
  const innerCircumference = 2 * Math.PI * innerR;
  const innerArc = innerCircumference * 0.22;
  const innerGap = innerCircumference - innerArc;

  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label="Loading"
    >
      <svg
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        fill="none"
        className="spinner-brand"
      >
        <defs>
          <linearGradient id={`sg-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4A574" stopOpacity="1" />
            <stop offset="100%" stopColor="#D4A574" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id={`sg-inner-${size}`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F2E6D8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#F2E6D8" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Outer arc — clockwise */}
        <circle
          cx={center}
          cy={center}
          r={r}
          stroke={`url(#sg-${size})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${gap}`}
          className="spinner-arc-outer"
        />

        {/* Inner arc — counter-clockwise */}
        <circle
          cx={center}
          cy={center}
          r={innerR}
          stroke={`url(#sg-inner-${size})`}
          strokeWidth={stroke * 0.7}
          strokeLinecap="round"
          strokeDasharray={`${innerArc} ${innerGap}`}
          className="spinner-arc-inner"
        />
      </svg>
    </span>
  );
}
