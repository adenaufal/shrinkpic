import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'striped';
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  variant = 'default',
  showPercentage = false,
  className = '',
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    default: 'bg-blue-500',
    gradient: 'bg-gradient-to-r from-blue-500 to-purple-500',
    striped: 'bg-blue-500 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 bg-[length:20px_100%] animate-shimmer',
  };

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Progress
          </span>
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
      <div className={`w-full ${sizeClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${variantClasses[variant]} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-label="Compression progress"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};
