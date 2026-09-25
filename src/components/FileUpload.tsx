import React, { useCallback, useRef } from 'react';
import { ACCEPT_ATTRIBUTE, MAX_FILES, MAX_FILE_BYTES } from '../utils/fileValidation';
import { formatFileSize } from '../utils/format';
import { modifierKeyLabel } from '../utils/platform';
import { DropArt, MarchingBorder } from './art/DropArt';

const FORMAT_LABELS = ['JPG', 'PNG', 'WebP', 'AVIF', 'GIF', 'BMP'];

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  isProcessing: boolean;
}

/**
 * The landing page's drop zone. It is a big click target for the file
 * picker; drops are handled by the full-window <DropOverlay>, which takes
 * over as soon as files are dragged anywhere onto the page (this zone
 * included), so there is exactly one drop path to get right.
 */
export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing }) => {
  const zoneRef = useRef<HTMLDivElement>(null);

  // The spotlight follows the pointer through CSS variables written straight
  // to the element — a state update per pointermove would re-render for
  // nothing but a background position.
  const trackPointer = useCallback((event: React.PointerEvent) => {
    const zone = zoneRef.current;
    if (!zone) return;
    const rect = zone.getBoundingClientRect();
    zone.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    zone.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      // Resetting the value is what makes re-picking the same file work after
      // it has been removed — `change` only fires when the value differs.
      e.target.value = '';
      if (files.length > 0) {
        onFileSelect(files);
      }
    },
    [onFileSelect]
  );

  return (
    <div
      ref={zoneRef}
      onPointerMove={trackPointer}
      className="drop-zone relative flex min-h-[15rem] flex-col items-center justify-center overflow-hidden rounded-2xl bg-white/70 px-6 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-brand-500 dark:bg-dark-card/60 sm:min-h-[16rem]"
    >
      <MarchingBorder radius={16} active={false} />
      <div className="drop-spotlight pointer-events-none absolute inset-0" aria-hidden="true" />

      <input
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={handleFileInput}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        disabled={isProcessing}
        aria-label="Choose images to compress"
      />

      <DropArt className="relative h-24 w-32" />

      <p className="relative mt-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Drop images here
      </p>
      <p className="relative mt-1 text-sm text-gray-500 dark:text-gray-400">
        or <span className="font-medium text-brand-600 dark:text-brand-400">click to browse</span>
        {/* Paste needs a keyboard; touch screens get the shorter line. */}
        <span className="hidden md:inline">
          {' '}
          · paste with <kbd className="kbd">{modifierKeyLabel()}</kbd> <kbd className="kbd">V</kbd>
        </span>
      </p>

      {/* A first-time visitor should be able to answer "what can I give it?"
          without leaving the page. */}
      <ul className="relative mt-5 flex flex-wrap justify-center gap-1.5" aria-label="Supported formats">
        {FORMAT_LABELS.map((label, index) => (
          <li
            key={label}
            className="animate-fade-up rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:border-dark-border dark:bg-dark-bg dark:text-gray-400"
            style={{ animationDelay: `${300 + index * 50}ms` }}
          >
            {label}
          </li>
        ))}
      </ul>
      <p className="relative mt-2 text-xs text-gray-500 dark:text-gray-400">
        Up to {MAX_FILES} images, {formatFileSize(MAX_FILE_BYTES)} each
      </p>
    </div>
  );
};
