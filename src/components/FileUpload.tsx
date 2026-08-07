import React, { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { ACCEPT_ATTRIBUTE, MAX_FILES, MAX_FILE_BYTES } from '../utils/fileValidation';
import { formatFileSize } from '../utils/format';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  isProcessing: boolean;
  hasImages: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing, hasImages }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const dragDepth = useRef(0);

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepth.current = 0;
      setIsDragActive(false);

      if (isProcessing) return;

      // Validation lives in the parent so the picker and the drop target
      // behave identically and nothing is ever discarded silently.
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFileSelect(files);
      }
    },
    [onFileSelect, isProcessing]
  );

  const dragHandlers = {
    onDragOver: handleDragOver,
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  const borderClass = isDragActive
    ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10'
    : 'border-gray-300 hover:border-brand-400 dark:border-dark-border dark:hover:border-brand-500';

  // Compact strip once the queue has images: the drop target must stay
  // available, otherwise dropping more files does nothing (or navigates away).
  if (hasImages) {
    return (
      <div
        className={`relative flex min-h-[2.75rem] items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-brand-500 ${borderClass} ${
          isProcessing ? 'opacity-60' : ''
        }`}
        {...dragHandlers}
      >
        <input
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          onChange={handleFileInput}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          disabled={isProcessing}
          aria-label="Add more images"
        />
        <Upload className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
        <span className="text-gray-600 dark:text-gray-400">
          {isDragActive ? 'Drop to add these images' : 'Add more images'}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex min-h-[15rem] flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition-colors focus-within:ring-2 focus-within:ring-brand-500 sm:min-h-[17rem] ${borderClass}`}
      {...dragHandlers}
    >
      <input
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={handleFileInput}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        disabled={isProcessing}
        aria-label="Upload images"
      />

      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        aria-hidden="true"
      >
        <Upload className="h-5 w-5" />
      </span>

      <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {isDragActive ? 'Drop to add these images' : 'Drop images here'}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">or click to browse</p>

      {/* A first-time visitor should be able to answer "what can I give it?"
          without leaving the page. The privacy promise is stated once, in the
          hero directly above this. */}
      <p className="mt-6 max-w-sm text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        JPG, PNG, WebP, AVIF, GIF and BMP &middot; up to {MAX_FILES} images,{' '}
        {formatFileSize(MAX_FILE_BYTES)} each
      </p>
    </div>
  );
};
