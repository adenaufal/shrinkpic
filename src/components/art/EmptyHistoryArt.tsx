import React, { useId } from 'react';

/**
 * Empty-state picture for the History panel: two blank photos drifting
 * gently, with a small clock badge whose minute hand sweeps round.
 */
export const EmptyHistoryArt: React.FC<{ className?: string }> = ({ className = '' }) => {
  const gradientId = `history-${useId().replace(/:/g, '')}`;

  return (
    <svg viewBox="0 0 96 72" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>

      <ellipse cx="46" cy="66" rx="28" ry="3" className="fill-slate-900/10 dark:fill-black/30" />

      <g className="history-float">
        <rect
          x="16"
          y="18"
          width="50"
          height="36"
          rx="7"
          strokeWidth="1.5"
          transform="rotate(-9 41 36)"
          className="fill-gray-100 stroke-gray-200 dark:fill-slate-800 dark:stroke-slate-600"
        />
        <rect
          x="24"
          y="12"
          width="50"
          height="36"
          rx="7"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          className="fill-white stroke-gray-300 dark:fill-dark-card dark:stroke-slate-500"
        />
        <circle cx="37" cy="23" r="4" className="fill-gray-200 dark:fill-slate-600" />
        <path d="M28 44l12-12 7 7 9-10 14 15z" className="fill-gray-200 dark:fill-slate-600" />
      </g>

      <g>
        <circle cx="72" cy="50" r="13" fill={`url(#${gradientId})`} />
        <path d="M72 50v-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <path className="history-hand" d="M72 50h6.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="72" cy="50" r="1.6" fill="#fff" />
      </g>
    </svg>
  );
};
