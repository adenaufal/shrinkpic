import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatFileSize } from '../utils/format';

interface ComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  fileName: string;
  onClose: () => void;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  beforeImage,
  afterImage,
  fileName,
  onClose,
  originalSize,
  compressedSize,
  compressionRatio,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;

    setSliderPosition(Math.min(Math.max(percentage, 0), 100));
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setSliderPosition(prev => Math.max(prev - 5, 0));
      } else if (e.key === 'ArrowRight') {
        setSliderPosition(prev => Math.min(prev + 5, 100));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl bg-white dark:bg-dark-card rounded-xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-dark-border">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
              {fileName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Drag the slider to compare images
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close comparison"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-dark-border">
          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Original Size</p>
            <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
              {formatFileSize(originalSize)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Compressed Size</p>
            <p className="text-sm md:text-base font-semibold text-green-600 dark:text-green-400">
              {formatFileSize(compressedSize)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Size Reduction</p>
            <p className="text-sm md:text-base font-semibold text-blue-600 dark:text-blue-400">
              {compressionRatio.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Comparison Container */}
        <div
          ref={containerRef}
          className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-ew-resize select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          {/* Before Image (Background) */}
          <div className="absolute inset-0">
            <img
              src={beforeImage}
              alt="Original"
              className="w-full h-full object-contain"
              draggable={false}
            />
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/70 text-white text-xs md:text-sm font-medium rounded-lg backdrop-blur-sm">
              Original
            </div>
          </div>

          {/* After Image (Clipped) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img
              src={afterImage}
              alt="Compressed"
              className="w-full h-full object-contain"
              draggable={false}
            />
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/70 text-white text-xs md:text-sm font-medium rounded-lg backdrop-blur-sm">
              Compressed
            </div>
          </div>

          {/* Slider Handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
            style={{ left: `${sliderPosition}%` }}
          >
            {/* Handle Circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-xl flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400 absolute left-1" />
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400 absolute right-1" />
            </div>
          </div>
        </div>

        {/* Footer Instructions */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-dark-border">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">←</kbd>
              <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">→</kbd>
              Arrow keys to move
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
