import React from 'react';
import { useInView } from '../hooks/useInView';
import { MAX_FILES } from '../utils/fileValidation';

/** An upload arrow rises, hits the device boundary, and bounces back down. */
const NoUploadArt: React.FC = () => (
  <svg viewBox="0 0 64 48" className="h-12 w-16" aria-hidden="true" focusable="false">
    <g className="fill-none stroke-gray-300 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round">
      <path d="M23 15h18a4.5 4.5 0 0 0 0-9 6.5 6.5 0 0 0-12.2-1.6A5.3 5.3 0 0 0 23 15z" />
      <path d="M21 3l22 14" />
    </g>
    <path
      className="tile-barrier stroke-brand-500 dark:stroke-brand-400"
      d="M8 22h48"
      strokeWidth="2"
      strokeDasharray="3 4"
      strokeLinecap="round"
    />
    <g className="tile-arrow svg-origin-center">
      <path
        d="M32 38V27m-4.5 4.5L32 27l4.5 4.5"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-violet-500 dark:stroke-violet-400"
      />
    </g>
    <rect x="20" y="38" width="24" height="7" rx="2" className="fill-gray-200 dark:fill-slate-700" />
  </svg>
);

/** The Wi-Fi signal drops out bar by bar — and the check stays green. */
const OfflineArt: React.FC = () => (
  <svg viewBox="0 0 64 48" className="h-12 w-16" aria-hidden="true" focusable="false">
    <g
      fill="none"
      strokeWidth="3"
      strokeLinecap="round"
      className="stroke-brand-500 dark:stroke-brand-400"
    >
      <path className="tile-wifi" style={{ animationDelay: '0s' }} d="M15 21q17-15 34 0" />
      <path className="tile-wifi" style={{ animationDelay: '0.25s' }} d="M21 27q11-10 22 0" />
      <path className="tile-wifi" style={{ animationDelay: '0.5s' }} d="M26.5 33q5.5-5 11 0" />
    </g>
    <circle cx="32" cy="38.5" r="2.6" className="fill-brand-500 dark:fill-brand-400" />
    <path
      className="tile-slash stroke-rose-400"
      d="M16 9l32 32"
      strokeWidth="2.5"
      strokeLinecap="round"
      pathLength="1"
      strokeDasharray="1"
    />
    <g className="tile-check svg-origin-center">
      <circle cx="50" cy="36" r="7.5" className="fill-emerald-500" />
      <path
        d="M46.5 36.2l2.4 2.4 4.6-4.8"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

/** Three workers filling at different speeds. */
const ParallelArt: React.FC = () => (
  <svg viewBox="0 0 64 48" className="h-12 w-16" aria-hidden="true" focusable="false">
    {[
      { y: 10, duration: '1.7s' },
      { y: 21, duration: '2.3s' },
      { y: 32, duration: '1.95s' },
    ].map(({ y, duration }) => (
      <g key={y}>
        <rect x="8" y={y} width="48" height="6" rx="3" className="fill-gray-200 dark:fill-slate-700" />
        <rect
          x="8"
          y={y}
          width="48"
          height="6"
          rx="3"
          className="tile-bar fill-brand-500 dark:fill-brand-400"
          style={{ animationDuration: duration }}
        />
      </g>
    ))}
  </svg>
);

const FEATURES = [
  {
    art: NoUploadArt,
    title: 'Nothing is uploaded',
    body: 'Your browser does all the work. There is no server to send files to.',
  },
  {
    art: OfflineArt,
    title: 'Works offline',
    body: 'Install it, or keep the tab open. Airplane mode is fine.',
  },
  {
    art: ParallelArt,
    title: 'Batches in parallel',
    body: `Up to ${MAX_FILES} images at once, spread across background workers.`,
  },
];

/**
 * Three promises under the empty drop zone, each with a tiny looping sketch.
 * The tiles fade up the first time they scroll into view and their loops
 * pause whenever they are off screen.
 */
export const Features: React.FC = () => {
  const { ref, inView, seen } = useInView<HTMLUListElement>('0px 0px -40px 0px');

  return (
    <ul
      ref={ref}
      aria-label="Why Shrinkpic"
      className={`grid gap-3 sm:grid-cols-3 ${inView ? '' : 'motion-paused'}`}
    >
      {FEATURES.map(({ art: Art, title, body }, index) => (
        <li
          key={title}
          className={`surface lift-hover flex items-start gap-3 p-4 sm:flex-col sm:gap-2 ${
            seen ? 'animate-fade-up' : 'opacity-0'
          }`}
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <span className="-ml-1 shrink-0 sm:-mt-1">
            <Art />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="mt-0.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
};
