import React from 'react';

interface ProgressBarProps {
  /** 0-100 */
  progress: number;
  className?: string;
}

/**
 * A slim brand-gradient track with a band of light sliding along the filled
 * part, so a slow step still reads as "working". No built-in label — callers
 * that need a percentage render their own text.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, className = '' }) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${className}`}
    >
      <div
        className="progress-shimmer relative h-full overflow-hidden rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-[width] duration-300 ease-out"
        style={{ width: `${clampedProgress}%` }}
        role="progressbar"
        aria-label="Compression progress"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
};
