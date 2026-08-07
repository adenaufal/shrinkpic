import React from 'react';

interface ProgressBarProps {
  /** 0-100 */
  progress: number;
  className?: string;
}

/**
 * A single hairline track in the accent colour — no gradients, no stripes, no
 * built-in label. Callers that need a percentage render their own text, so the
 * bar itself stays one flat shape.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, className = '' }) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div
      className={`h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${className}`}
    >
      <div
        className="h-full rounded-full bg-brand-600 transition-all duration-300 ease-out dark:bg-brand-500"
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
