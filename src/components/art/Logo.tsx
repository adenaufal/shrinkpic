import React, { useId } from 'react';

interface LogoProps {
  className?: string;
  /** Pump the press continuously — the header sets this while a batch runs. */
  busy?: boolean;
}

/**
 * The favicon artwork, inlined so its parts can move: the two arrows press in
 * and the photo squashes between them. It plays once on load, again whenever
 * the surrounding `.group` is hovered, and loops while `busy`.
 *
 * Keep the geometry in sync with public/favicon.svg.
 */
export const Logo: React.FC<LogoProps> = ({ className = '', busy = false }) => {
  // useId output contains colons, which are awkward inside url(#…) references.
  const gradientId = `logo-${useId().replace(/:/g, '')}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={`logo ${busy ? 'logo-busy' : ''} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="14" fill={`url(#${gradientId})`} />

      <path className="logo-arrow-top svg-origin-center" d="M23 5h18L32 17z" fill="#fff" />
      <path className="logo-arrow-bottom svg-origin-center" d="M23 59h18L32 47z" fill="#fff" />

      <g className="logo-photo svg-origin-center">
        <rect x="9" y="21" width="46" height="22" rx="5" fill="#fff" />
        <circle cx="19" cy="28.5" r="3.2" fill="#3B82F6" />
        <path d="M13 40.5 22.5 31l5.5 5.5L36 28.5l13 12z" fill="#8B5CF6" />
      </g>
    </svg>
  );
};
