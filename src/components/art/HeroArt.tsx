import React, { useId } from 'react';
import { useInView } from '../../hooks/useInView';

type PixelStyle = React.CSSProperties & Record<'--dx' | '--dy', string>;
type ChipStyle = React.CSSProperties & Record<'--rot', string>;

/**
 * Bytes squeezed out of the photo. Each one starts at the edge of the
 * squashed card and flies outwards — but fades before it reaches the window
 * frame, because nothing leaves the browser.
 */
const PIXELS = [
  { x: 152, y: 126, dx: -48, dy: -20, size: 6, tone: 'fill-brand-400', delay: 0 },
  { x: 150, y: 136, dx: -70, dy: -6, size: 4, tone: 'fill-violet-400', delay: 0.04 },
  { x: 152, y: 145, dx: -58, dy: 8, size: 7, tone: 'fill-brand-300', delay: 0.02 },
  { x: 154, y: 156, dx: -40, dy: 22, size: 5, tone: 'fill-violet-300', delay: 0.06 },
  { x: 148, y: 141, dx: -86, dy: 0, size: 3, tone: 'fill-brand-500', delay: 0.09 },
  { x: 150, y: 131, dx: -30, dy: -34, size: 3, tone: 'fill-amber-300', delay: 0.05 },
  { x: 288, y: 126, dx: 48, dy: -20, size: 6, tone: 'fill-violet-400', delay: 0.03 },
  { x: 290, y: 136, dx: 70, dy: -6, size: 4, tone: 'fill-brand-400', delay: 0 },
  { x: 288, y: 145, dx: 58, dy: 8, size: 7, tone: 'fill-violet-300', delay: 0.05 },
  { x: 286, y: 156, dx: 40, dy: 22, size: 5, tone: 'fill-brand-300', delay: 0.02 },
  { x: 292, y: 141, dx: 86, dy: 0, size: 3, tone: 'fill-violet-500', delay: 0.08 },
  { x: 290, y: 131, dx: 30, dy: -34, size: 3, tone: 'fill-amber-300', delay: 0.06 },
];

/** Format stickers floating around the window. */
const CHIPS = [
  { label: 'JPG', x: 4, y: 88, width: 46, dot: 'fill-amber-400', rot: '-6deg', delay: '0s' },
  { label: 'PNG', x: 390, y: 66, width: 46, dot: 'fill-emerald-400', rot: '5deg', delay: '-1.4s' },
  { label: 'WebP', x: 384, y: 192, width: 54, dot: 'fill-sky-400', rot: '-4deg', delay: '-2.6s' },
  { label: 'AVIF', x: 0, y: 202, width: 52, dot: 'fill-violet-400', rot: '4deg', delay: '-3.3s' },
];

/**
 * The hero's signature illustration: a browser window with a conveyor of
 * photos. Each photo slides in, the logo's two arrows press it flat, loose
 * pixels burst out of the sides, and it leaves at a fraction of its size
 * while the tag underneath swaps from the old size to the new one.
 *
 * Purely decorative — the heading next to it says the same thing in words.
 * The loop pauses while scrolled out of view.
 */
export const HeroArt: React.FC<{ className?: string }> = ({ className = '' }) => {
  const uid = useId().replace(/:/g, '');
  const { ref, inView } = useInView<SVGSVGElement>();

  return (
    <svg
      ref={ref}
      viewBox="0 0 440 300"
      className={`hero-art select-none ${inView ? '' : 'motion-paused'} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-brand`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0" stopColor="#8B5CF6" stopOpacity="0.4" />
          <stop offset="0.5" stopColor="#3B82F6" stopOpacity="0.15" />
          <stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#DBEAFE" />
          <stop offset="1" stopColor="#EDE9FE" />
        </linearGradient>
        <clipPath id={`${uid}-stage`}>
          <rect x="31" y="57" width="378" height="202" />
        </clipPath>
        <clipPath id={`${uid}-photo`}>
          <rect x="160" y="102" width="120" height="80" rx="10" />
        </clipPath>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="220" cy="274" rx="176" ry="9" className="fill-slate-900/10 dark:fill-black/25" />

      {/* Browser window */}
      <rect
        x="30"
        y="24"
        width="380"
        height="236"
        rx="18"
        strokeWidth="1.5"
        className="fill-white stroke-gray-200 dark:fill-dark-card dark:stroke-dark-border"
      />
      <path d="M31 56h378" strokeWidth="1.5" className="stroke-gray-200 dark:stroke-dark-border" />
      {[52, 67, 82].map((cx) => (
        <circle key={cx} cx={cx} cy="40" r="4.5" className="fill-gray-200 dark:fill-slate-600" />
      ))}

      {/* Address bar: the only "server" in the picture is this device. */}
      <rect x="132" y="31" width="176" height="18" rx="9" className="fill-gray-100 dark:fill-dark-bg" />
      <rect x="146" y="39.5" width="8" height="6" rx="1.5" className="fill-emerald-500" />
      <path
        d="M147.8 39.5v-1.6a2.2 2.2 0 0 1 4.4 0v1.6"
        fill="none"
        strokeWidth="1.3"
        className="stroke-emerald-500"
      />
      <text x="160" y="43.8" fontSize="9.5" fontWeight="500" className="fill-gray-500 dark:fill-gray-400">
        processed on this device
      </text>

      {/* Stage */}
      <g clipPath={`url(#${uid}-stage)`}>
        <circle className="hero-glow svg-origin-center" cx="220" cy="142" r="110" fill={`url(#${uid}-glow)`} />

        <g className="hero-card svg-origin-center">
          <rect x="160" y="102" width="120" height="80" rx="10" fill={`url(#${uid}-sky)`} />
          <g clipPath={`url(#${uid}-photo)`}>
            <circle cx="187" cy="126" r="9" className="fill-amber-300" />
            <path d="M150 190 196 138l19 19 26-31 51 64z" className="fill-violet-500" />
            <path d="M150 190l34-33 29 33z" className="fill-brand-500" />
          </g>
          <rect
            x="160"
            y="102"
            width="120"
            height="80"
            rx="10"
            fill="none"
            strokeWidth="1.5"
            className="stroke-white/70 dark:stroke-slate-500"
          />
        </g>

        {PIXELS.map((pixel, index) => (
          <rect
            key={index}
            x={pixel.x - pixel.size / 2}
            y={pixel.y - pixel.size / 2}
            width={pixel.size}
            height={pixel.size}
            rx="1"
            className={`hero-pixel svg-origin-center ${pixel.tone}`}
            style={
              {
                '--dx': `${pixel.dx}px`,
                '--dy': `${pixel.dy}px`,
                animationDelay: `${pixel.delay}s`,
              } as PixelStyle
            }
          />
        ))}
      </g>

      {/* The press — the same two arrows as the logo. */}
      <path
        className="hero-press-top svg-origin-center"
        d="M207 69h26l-13 15z"
        fill={`url(#${uid}-brand)`}
        stroke={`url(#${uid}-brand)`}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        className="hero-press-bottom svg-origin-center"
        d="M207 215h26l-13-15z"
        fill={`url(#${uid}-brand)`}
        stroke={`url(#${uid}-brand)`}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Size tag: before → after */}
      <rect
        x="158"
        y="227"
        width="124"
        height="22"
        rx="11"
        strokeWidth="1"
        className="fill-gray-50 stroke-gray-200 dark:fill-dark-bg dark:stroke-dark-border"
      />
      <text
        x="220"
        y="242"
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        className="hero-size-before fill-gray-500 dark:fill-gray-400"
      >
        4.8 MB
      </text>
      <text
        x="220"
        y="242"
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        className="hero-size-after svg-origin-center fill-gray-900 dark:fill-gray-100"
      >
        780 KB <tspan className="fill-brand-600 dark:fill-brand-400">−84%</tspan>
      </text>

      {/* Floating format stickers */}
      {CHIPS.map((chip) => (
        <g
          key={chip.label}
          className="hero-chip svg-origin-center"
          style={{ '--rot': chip.rot, animationDelay: chip.delay } as ChipStyle}
        >
          <rect
            x={chip.x}
            y={chip.y}
            width={chip.width}
            height="22"
            rx="8"
            strokeWidth="1"
            className="fill-white stroke-gray-200 dark:fill-slate-800 dark:stroke-slate-600"
          />
          <circle cx={chip.x + 11} cy={chip.y + 11} r="3" className={chip.dot} />
          <text
            x={chip.x + 18}
            y={chip.y + 15}
            fontSize="10"
            fontWeight="600"
            className="fill-gray-700 dark:fill-gray-200"
          >
            {chip.label}
          </text>
        </g>
      ))}
    </svg>
  );
};
