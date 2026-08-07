import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  X,
  TrendingDown,
  Copy,
  ArrowLeftRight,
  Edit2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  downloadFile,
  copyImageToClipboard,
  isClipboardSupported,
  outputFilename,
} from '../utils/imageCompression';
import { formatFileSize } from '../utils/format';
import { ComparisonSlider } from './ComparisonSlider';
import { ProgressBar } from './ui/ProgressBar';
import { ImageEditor } from './ImageEditor';
import type { QueuedImage } from '../types';

interface ImagePreviewProps {
  images: QueuedImage[];
  onRemove: (id: string) => void;
  onEdit: (id: string, editedFile: File) => void;
  onRetry: (id: string) => void;
  isProcessing: boolean;
}

type CopyState = 'idle' | 'copying' | 'success' | 'error';

interface SourceUrlEntry {
  file: File;
  url: string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  images,
  onRemove,
  onEdit,
  onRetry,
  isProcessing,
}) => {
  const [copyStatus, setCopyStatus] = useState<Record<string, CopyState>>({});
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Source preview URLs, cached by stable id. The old version rebuilt (and
  // revoked) every URL on each progress tick, which made the whole grid flicker
  // through broken-image icons while compressing.
  const sourceUrls = useRef<Map<string, SourceUrlEntry>>(new Map());
  const [, bumpUrlVersion] = useState(0);

  useEffect(() => {
    const cache = sourceUrls.current;
    const liveIds = new Set(images.map((image) => image.id));
    let changed = false;

    cache.forEach((entry, id) => {
      if (!liveIds.has(id)) {
        URL.revokeObjectURL(entry.url);
        cache.delete(id);
        changed = true;
      }
    });

    images.forEach((image) => {
      const entry = cache.get(image.id);
      if (!entry || entry.file !== image.file) {
        if (entry) URL.revokeObjectURL(entry.url);
        cache.set(image.id, { file: image.file, url: URL.createObjectURL(image.file) });
        changed = true;
      }
    });

    if (changed) {
      bumpUrlVersion((version) => version + 1);
    }
  }, [images]);

  useEffect(() => {
    const cache = sourceUrls.current;
    return () => {
      cache.forEach((entry) => URL.revokeObjectURL(entry.url));
      cache.clear();
    };
  }, []);

  const clipboardAvailable = isClipboardSupported();

  const handleDownload = (image: QueuedImage) => {
    if (!image.result) return;
    downloadFile(image.result.blob, outputFilename(image.file.name, image.result.outputType));
  };

  const handleCopyImage = async (image: QueuedImage) => {
    if (!image.result) return;

    setCopyStatus((prev) => ({ ...prev, [image.id]: 'copying' }));
    try {
      await copyImageToClipboard(image.result.blob);
      setCopyStatus((prev) => ({ ...prev, [image.id]: 'success' }));
    } catch (error) {
      console.error('Failed to copy image:', error);
      setCopyStatus((prev) => ({ ...prev, [image.id]: 'error' }));
    }
    setTimeout(() => setCopyStatus((prev) => ({ ...prev, [image.id]: 'idle' })), 2000);
  };

  if (images.length === 0) return null;

  const comparisonImage = comparisonId ? images.find((image) => image.id === comparisonId) : undefined;
  const editingImage = editingId ? images.find((image) => image.id === editingId) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Images ({images.length})
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
        {images.map((image) => {
          const sourceUrl = sourceUrls.current.get(image.id)?.url ?? '';
          const copyState = copyStatus[image.id] ?? 'idle';

          return (
            <div
              key={image.id}
              className="bg-white dark:bg-dark-card rounded-lg md:rounded-xl p-2 md:p-4 shadow-lg border border-gray-100 dark:border-dark-border animate-slide-up transition-colors duration-300"
            >
              <div className="flex justify-between items-start mb-1 md:mb-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate pr-1 text-xs md:text-base">
                  {image.file.name}
                </h4>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!image.result && image.status !== 'processing' && (
                    <button
                      onClick={() => setEditingId(image.id)}
                      disabled={isProcessing}
                      className="text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`Edit ${image.file.name}`}
                      title={isProcessing ? 'Available once compression finishes' : 'Edit image'}
                    >
                      <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(image.id)}
                    disabled={isProcessing}
                    className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label={`Remove ${image.file.name}`}
                    title={isProcessing ? 'Available once compression finishes' : 'Remove image'}
                  >
                    <X className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>

              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md md:rounded-lg mb-2 md:mb-4 overflow-hidden">
                {sourceUrl && (
                  <img
                    src={image.result?.url || sourceUrl}
                    alt={image.file.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="space-y-1 md:space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Original:</span>
                  <span className="font-medium dark:text-gray-200">
                    {formatFileSize(image.file.size)}
                  </span>
                </div>

                {image.result?.originalWidth && image.result?.originalHeight && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Resolution:</span>
                    <span className="font-medium dark:text-gray-200">
                      {image.result.originalWidth} × {image.result.originalHeight}
                    </span>
                  </div>
                )}

                {image.status === 'processing' && (
                  <>
                    <div className="flex items-center space-x-1 md:space-x-2 text-blue-600 dark:text-blue-400 mb-3">
                      <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Processing...</span>
                    </div>
                    <ProgressBar
                      progress={image.progress || 0}
                      variant="gradient"
                      showPercentage={true}
                      size="md"
                    />
                  </>
                )}

                {image.status === 'error' && (
                  <div className="rounded-md md:rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 p-2 space-y-2">
                    <div className="flex items-start gap-1.5 text-red-700 dark:text-red-300">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <p className="text-xs leading-snug">{image.error || 'Compression failed.'}</p>
                    </div>
                    <button
                      onClick={() => onRetry(image.id)}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                )}

                {image.result && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Compressed:</span>
                      <span
                        className={`font-medium ${
                          image.result.alreadyOptimized
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {formatFileSize(image.result.compressedSize)}
                      </span>
                    </div>

                    <div className="space-y-1 md:space-y-2">
                      {image.result.alreadyOptimized ? (
                        <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                          <ShieldCheck className="w-3 h-3" />
                          <span className="text-xs font-medium">Already optimized — original kept</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                          <TrendingDown className="w-3 h-3" />
                          <span className="text-xs font-medium">
                            {image.result.compressionRatio.toFixed(1)}% smaller
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-1 md:gap-2">
                        <button
                          onClick={() => setComparisonId(image.id)}
                          className="flex items-center justify-center space-x-1 px-1 md:px-2 py-1 md:py-1.5 rounded-md md:rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all duration-200 transform active:scale-95"
                          title="Compare before and after"
                          aria-label={`Compare ${image.file.name}`}
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          <span className="hidden md:inline">Compare</span>
                        </button>
                        <button
                          onClick={() => handleCopyImage(image)}
                          disabled={copyState === 'copying' || !clipboardAvailable}
                          className={`flex items-center justify-center space-x-1 px-1 md:px-2 py-1 md:py-1.5 rounded-md md:rounded-lg text-xs font-medium transition-all duration-200 transform active:scale-95 ${
                            copyState === 'success'
                              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950'
                              : copyState === 'error'
                              ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950'
                              : 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900'
                          } ${
                            copyState === 'copying' || !clipboardAvailable
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                          title={
                            !clipboardAvailable
                              ? 'This browser cannot copy images to the clipboard'
                              : copyState === 'success'
                              ? 'Copied!'
                              : copyState === 'error'
                              ? 'Copy failed'
                              : 'Copy image to clipboard'
                          }
                          aria-label={copyState === 'success' ? 'Image copied' : 'Copy image to clipboard'}
                        >
                          <Copy className="w-3 h-3" />
                          <span className="hidden md:inline">
                            {copyState === 'success' ? 'Copied!' : 'Copy'}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDownload(image)}
                          className="flex items-center justify-center space-x-1 bg-blue-600 dark:bg-blue-500 text-white px-1 md:px-2 py-1 md:py-1.5 rounded-md md:rounded-lg text-xs font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 transform active:scale-95"
                          aria-label={`Download ${image.file.name}`}
                        >
                          <Download className="w-3 h-3" />
                          <span className="hidden md:inline">Download</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Modal */}
      {comparisonImage?.result && (
        <ComparisonSlider
          beforeImage={sourceUrls.current.get(comparisonImage.id)?.url ?? ''}
          afterImage={comparisonImage.result.url}
          fileName={comparisonImage.file.name}
          onClose={() => setComparisonId(null)}
          originalSize={comparisonImage.result.originalSize}
          compressedSize={comparisonImage.result.compressedSize}
          compressionRatio={comparisonImage.result.compressionRatio}
        />
      )}

      {/* Image Editor */}
      {editingImage && (
        <ImageEditor
          file={editingImage.file}
          onSave={(editedFile) => {
            onEdit(editingImage.id, editedFile);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      )}
    </div>
  );
};
