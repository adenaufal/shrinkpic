import React, { useCallback, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Layers, Lock } from 'lucide-react';
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

  // Compact strip once the queue has images: the drop target must stay
  // available, otherwise dropping more files does nothing (or navigates away).
  if (hasImages) {
    return (
      <div
        className={`relative border-2 border-dashed rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm transition-colors duration-200 focus-within:ring-2 focus-within:ring-blue-500 ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
        } ${isProcessing ? 'opacity-60' : ''}`}
        {...dragHandlers}
      >
        <input
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          disabled={isProcessing}
          aria-label="Add more images"
        />
        <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-gray-600 dark:text-gray-400">
          {isDragActive ? 'Drop to add these images' : 'Drop more images here, or click to browse'}
        </span>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div
        className={`relative border-2 border-dashed rounded-2xl text-center p-12 min-h-[280px] flex flex-col justify-center transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500 ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
            : isProcessing
            ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
        }`}
        {...dragHandlers}
      >
        <input
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
          aria-label="Upload images"
        />

        <div className="flex flex-col items-center space-y-4">
          <div className={`p-4 rounded-full transition-colors ${
            isProcessing ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            {isProcessing ? (
              <div className="w-8 h-8 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {isProcessing ? 'Processing...' : isDragActive ? 'Drop your images' : 'Drop your images here'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {isProcessing
                ? 'Compressing your images in your browser'
                : 'or click to browse — shrink photos, screenshots and graphics before you send them'}
            </p>
          </div>

          {/* A first-time visitor should be able to answer "what does this do,
              what can I give it, and where do my files go" without leaving. */}
          <div className="flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                JPG, PNG, WebP, AVIF, GIF, BMP
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 shrink-0" aria-hidden="true" />
                Up to {MAX_FILES} images, {formatFileSize(MAX_FILE_BYTES)} each
              </span>
            </div>
            <span className="flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
              <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
              Compressed on this device — your files are never uploaded
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
