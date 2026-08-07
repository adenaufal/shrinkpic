import React, { useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogClose, DialogPanel } from './ui/dialog';
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

const STEP = 5;
const LARGE_STEP = 10;

/**
 * Built on Radix Dialog for focus trap / Escape / focus restore, and on
 * Pointer Events (rather than separate mouse and touch listeners) so one
 * code path drives mouse, touch and pen alike. `touch-none` stops the
 * browser from panning the page while the divider is being dragged.
 */
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
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;

    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.min(Math.max(percentage, 0), 100));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const stopDragging = () => setIsDragging(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? LARGE_STEP : STEP;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(prev - step, 0));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(prev + step, 100));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPosition(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPosition(100);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPanel className="max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 dark:border-dark-border md:p-6">
          <div className="min-w-0">
            <DialogPrimitive.Title className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
              {fileName}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Drag the slider, or focus it and use the arrow keys, to compare images
            </DialogPrimitive.Description>
          </div>
          <DialogClose asChild>
            <button
              className="btn btn-ghost btn-icon -mr-2"
              aria-label="Close comparison"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </DialogClose>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 border-b border-gray-200 p-4 dark:border-dark-border">
          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Original Size</p>
            <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
              {formatFileSize(originalSize)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Compressed Size</p>
            <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
              {formatFileSize(compressedSize)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Size Reduction</p>
            <p className="text-sm md:text-base font-semibold text-brand-600 dark:text-brand-400">
              {compressionRatio.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Comparison Container */}
        <div
          ref={containerRef}
          className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-ew-resize select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
          {/* Before Image (Background) — the right (100 - position)% of this
              layer shows through where the After layer is clipped away. */}
          <div className="absolute inset-0">
            <img
              src={beforeImage}
              alt={`${fileName} before compression`}
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>

          {/* After Image (Clipped) — visible across the left `position`% of
              the frame, painted on top of the Before layer. */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img
              src={afterImage}
              alt={`${fileName} after compression`}
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>

          {/* Badges pinned outside the clipped layers so they stay visible
              at every slider position, matching what each side actually
              renders: Compressed on the left (After layer), Original on the
              right (Before layer showing through). */}
          <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-gray-900/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            Compressed
          </div>
          <div className="pointer-events-none absolute right-3 top-3 rounded-lg bg-gray-900/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            Original
          </div>

          {/* Slider Handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize touch-none"
            style={{ left: `${sliderPosition}%` }}
          >
            {/* Handle Circle — the actual slider control: focusable, arrow-key
                operable, and announced with its current position. */}
            <div
              role="slider"
              tabIndex={0}
              aria-label="Comparison position"
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(sliderPosition)}
              aria-valuetext={`${Math.round(sliderPosition)}% compressed, ${100 - Math.round(sliderPosition)}% original`}
              onKeyDown={handleKeyDown}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-xl flex items-center justify-center border-2 border-gray-200 dark:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400 absolute left-1" />
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400 absolute right-1" />
            </div>
          </div>
        </div>

        {/* Footer Instructions */}
        <div className="border-t border-gray-200 p-4 dark:border-dark-border">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 px-1.5 py-0.5 dark:border-dark-border">←</kbd>
              <kbd className="rounded border border-gray-200 px-1.5 py-0.5 dark:border-dark-border">→</kbd>
              Move the focused slider
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 px-1.5 py-0.5 dark:border-dark-border">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  );
};
