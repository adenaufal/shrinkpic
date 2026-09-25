import React, { useId } from 'react';

interface PhotoProps {
  x: number;
  y: number;
  muted?: boolean;
  skyId?: string;
}

const Photo: React.FC<PhotoProps> = ({ x, y, muted = false, skyId }) => (
  <>
    <rect
      x={x}
      y={y}
      width="60"
      height="44"
      rx="7"
      strokeWidth="1.5"
      fill={muted ? undefined : `url(#${skyId})`}
      className={
        muted
          ? 'fill-white stroke-gray-200 dark:fill-slate-800 dark:stroke-slate-600'
          : 'stroke-white dark:stroke-slate-500'
      }
    />
    <circle
      cx={x + 16}
      cy={y + 13}
      r="5"
      className={muted ? 'fill-gray-200 dark:fill-slate-600' : 'fill-amber-300'}
    />
    <path
      d={`M${x + 4} ${y + 40} l16-16 9 9 12-14 15 21z`}
      className={muted ? 'fill-gray-200 dark:fill-slate-600' : 'fill-violet-500'}
    />
    {!muted && <path d={`M${x + 4} ${y + 40} l12-11 13 11z`} className="fill-brand-500" />}
  </>
);

/**
 * The drop zone's illustration: a small stack of photos with an upload badge.
 * At rest the front photo bobs; hovering fans the stack out; dragging files
 * over the zone lifts the stack and flips the badge to point down, into it.
 * All three states are driven by CSS off the parent `.drop-zone`.
 */
export const DropArt: React.FC<{ className?: string }> = ({ className = '' }) => {
  const uid = useId().replace(/:/g, '');

  return (
    <svg viewBox="0 0 128 96" className={`drop-art ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#DBEAFE" />
          <stop offset="1" stopColor="#EDE9FE" />
        </linearGradient>
        <linearGradient id={`${uid}-badge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>

      <ellipse cx="64" cy="88" rx="34" ry="4" className="drop-art-shadow fill-slate-900/10 dark:fill-black/30" />

      <g className="drop-stack">
        <g className="drop-card-left">
          <Photo x={34} y={34} muted />
        </g>
        <g className="drop-card-right">
          <Photo x={34} y={34} muted />
        </g>
        <g className="drop-card-front">
          <g className="drop-card-bob">
            <Photo x={34} y={34} skyId={`${uid}-sky`} />
          </g>
        </g>
      </g>

      <g className="drop-badge">
        <g className="drop-badge-flip">
          <circle cx="94" cy="30" r="13" fill={`url(#${uid}-badge)`} />
          <path
            d="M94 36.5v-13m-5 5 5-5 5 5"
            fill="none"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
};

interface MarchingBorderProps {
  /** Matches the parent's border radius, in px. */
  radius: number;
  /** Dragging files over the parent: gradient stroke, fast march. */
  active: boolean;
}

/**
 * A dashed border drawn in SVG so the dashes can move ("marching ants").
 * It sits edge-to-edge inside a parent with `overflow: hidden` and the same
 * radius, so the outer half of the stroke is clipped and the visible half
 * follows the rounded corners exactly.
 */
export const MarchingBorder: React.FC<MarchingBorderProps> = ({ radius, active }) => {
  const gradientId = `march-${useId().replace(/:/g, '')}`;

  return (
    <svg
      className="marching-border pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect
        width="100%"
        height="100%"
        rx={radius}
        ry={radius}
        fill="none"
        strokeWidth="3"
        strokeDasharray="8 8"
        stroke={active ? `url(#${gradientId})` : undefined}
      />
    </svg>
  );
};
