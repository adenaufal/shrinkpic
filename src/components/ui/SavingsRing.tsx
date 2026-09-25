import React, { useId } from 'react';

interface SavingsRingProps {
  /** 0-100. Pass an already-tweened value; the ring does not animate itself. */
  percent: number;
  size?: number;
}

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A gradient ring gauge for "how much smaller did the batch get". */
export const SavingsRing: React.FC<SavingsRingProps> = ({ percent, size = 52 }) => {
  const gradientId = `ring-${useId().replace(/:/g, '')}`;
  const clamped = Math.min(Math.max(percent, 0), 100);

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className="-rotate-90"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <circle
        cx="24"
        cy="24"
        r={RADIUS}
        fill="none"
        strokeWidth="5"
        className="stroke-gray-200 dark:stroke-slate-700"
      />
      <circle
        cx="24"
        cy="24"
        r={RADIUS}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        stroke={`url(#${gradientId})`}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
        // A round cap on a zero-length dash still paints a dot.
        opacity={clamped < 0.5 ? 0 : 1}
      />
    </svg>
  );
};
