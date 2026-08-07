import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  X,
  Copy,
  Check,
  ArrowLeftRight,
  Edit2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  downloadFile,
  copyImageToClipboard,
  isClipboardSupported,
  outputFilename,
  formatLabelFromMime,
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
  /**
   * Reports whether one of this component's modals (editor, comparison) is
   * open. The app disables its global shortcuts while one is — a stray Delete
   * inside the editor would otherwise clear the queue and discard the edit.
   */
  onModalOpenChange?: (open: boolean) => void;
}

type CopyState = 'idle' | 'copying' | 'success' | 'error';

interface SourceUrlEntry {
  file: File;
  url: string;
}

interface ImageCardProps {
  image: QueuedImage;
  sourceUrl: string;
  copyState: CopyState;
  clipboardAvailable: boolean;
  isProcessing: boolean;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onEditRequest: (id: string) => void;
  onCompareRequest: (id: string) => void;
  onDownload: (id: string) => void;
  onCopyImage: (id: string) => void;
}

const overlayButtonClass =
  'btn btn-icon bg-white/90 text-gray-700 backdrop-blur hover:bg-white dark:bg-dark-bg/80 dark:text-gray-200 dark:hover:bg-dark-bg';

/**
 * One card in the grid, memoized so a progress tick for image A does not
 * force React to re-render cards B, C, ... — `App` writes back per-image
 * results by id via `.map`, so untouched entries keep the same object
 * reference and this component's default shallow-prop comparison bails out.
 *
 * The card answers two questions and nothing else: how much smaller did this
 * get, and how do I download it.
 */
const ImageCard: React.FC<ImageCardProps> = React.memo(function ImageCard({
  image,
  sourceUrl,
  copyState,
  clipboardAvailable,
  isProcessing,
  onRemove,
  onRetry,
  onEditRequest,
  onCompareRequest,
  onDownload,
  onCopyImage,
}) {
  const result = image.result;

  return (
    <article className="surface animate-fade-in overflow-hidden">
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
        {sourceUrl && (
          <img
            src={result?.url || sourceUrl}
            alt={image.file.name}
            className="h-full w-full object-cover"
          />
        )}

        <div className="absolute right-2 top-2 flex gap-1">
          {!result && image.status !== 'processing' && (
            <button
              type="button"
              onClick={() => onEditRequest(image.id)}
              disabled={isProcessing}
              className={overlayButtonClass}
              aria-label={`Edit ${image.file.name}`}
              title={isProcessing ? 'Available once compression finishes' : 'Edit image'}
            >
              <Edit2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(image.id)}
            disabled={isProcessing}
            className={overlayButtonClass}
            aria-label={`Remove ${image.file.name}`}
            title={isProcessing ? 'Available once compression finishes' : 'Remove image'}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="p-3 md:p-4">
        <p
          className="truncate text-sm font-medium text-gray-900 dark:text-gray-100"
          title={image.file.name}
        >
          {image.file.name}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(image.file.size)}
          {result ? ` → ${formatFileSize(result.compressedSize)}` : ''}
        </p>

        {image.status === 'processing' && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">
              Compressing… {Math.round(image.progress || 0)}%
            </p>
            {/* The batch-level aria-live region announces progress; a bar per
                card would spam a screen reader with dozens of updates. */}
            <div aria-hidden="true">
              <ProgressBar progress={image.progress || 0} />
            </div>
          </div>
        )}

        {image.status === 'error' && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 dark:border-red-900 dark:bg-red-950/40">
            <p className="flex items-start gap-1.5 text-xs leading-snug text-red-700 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {image.error || 'Compression failed.'}
            </p>
            <button
              type="button"
              onClick={() => onRetry(image.id)}
              disabled={isProcessing}
              className="btn btn-danger mt-2 w-full"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {result && (
          <>
            <p className="mt-2 text-sm">
              {result.alreadyOptimized ? (
                <span className="text-gray-600 dark:text-gray-400">
                  {result.formatConversionSkipped && result.requestedOutputType
                    ? `Kept the original ${formatLabelFromMime(result.outputType)} — ${formatLabelFromMime(
                        result.requestedOutputType
                      )} would be larger`
                    : 'Already as small as it gets — original kept'}
                </span>
              ) : (
                <span className="font-semibold text-brand-600 dark:text-brand-400">
                  {result.compressionRatio.toFixed(0)}% smaller
                </span>
              )}
            </p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onDownload(image.id)}
                className="btn btn-primary min-w-0 flex-1"
                aria-label={`Download ${image.file.name}`}
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">Download</span>
              </button>
              <button
                type="button"
                onClick={() => onCompareRequest(image.id)}
                className="btn btn-secondary btn-icon"
                aria-label={`Compare ${image.file.name} before and after`}
                title="Compare before and after"
              >
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onCopyImage(image.id)}
                disabled={copyState === 'copying' || !clipboardAvailable}
                className="btn btn-secondary btn-icon"
                aria-label={
                  copyState === 'success'
                    ? `${image.file.name} copied to the clipboard`
                    : `Copy ${image.file.name} to the clipboard`
                }
                title={
                  !clipboardAvailable
                    ? 'This browser cannot copy images to the clipboard'
                    : copyState === 'error'
                    ? 'Copy failed'
                    : 'Copy image to clipboard'
                }
              >
                {copyState === 'success' ? (
                  <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
});

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  images,
  onRemove,
  onEdit,
  onRetry,
  isProcessing,
  onModalOpenChange,
}) => {
  const [copyStatus, setCopyStatus] = useState<Record<string, CopyState>>({});
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Latest `images` without making every callback below depend on (and
  // change identity with) the array itself — that would defeat ImageCard's
  // memoization on every progress tick.
  const imagesRef = useRef<QueuedImage[]>(images);
  useEffect(() => {
    imagesRef.current = images;
  });

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

  const handleDownload = useCallback((id: string) => {
    const image = imagesRef.current.find((item) => item.id === id);
    if (!image?.result) return;
    downloadFile(image.result.blob, outputFilename(image.file.name, image.result.outputType));
  }, []);

  const handleCopyImage = useCallback(async (id: string) => {
    const image = imagesRef.current.find((item) => item.id === id);
    if (!image?.result) return;

    setCopyStatus((prev) => ({ ...prev, [id]: 'copying' }));
    try {
      await copyImageToClipboard(image.result.blob);
      setCopyStatus((prev) => ({ ...prev, [id]: 'success' }));
    } catch (error) {
      console.error('Failed to copy image:', error);
      setCopyStatus((prev) => ({ ...prev, [id]: 'error' }));
    }
    setTimeout(() => setCopyStatus((prev) => ({ ...prev, [id]: 'idle' })), 2000);
  }, []);

  const handleCompareRequest = useCallback((id: string) => setComparisonId(id), []);
  const handleEditRequest = useCallback((id: string) => setEditingId(id), []);

  const modalOpen = comparisonId !== null || editingId !== null;
  useEffect(() => {
    onModalOpenChange?.(modalOpen);
    // Unmounting (the queue was cleared) takes the modals with it.
    return () => onModalOpenChange?.(false);
  }, [modalOpen, onModalOpenChange]);

  if (images.length === 0) return null;

  const comparisonImage = comparisonId ? images.find((image) => image.id === comparisonId) : undefined;
  const editingImage = editingId ? images.find((image) => image.id === editingId) : undefined;

  // The batch total, stated once as a sentence rather than as a card of
  // labelled figures above the grid.
  const doneCount = images.filter((image) => image.result).length;
  const totalOriginalSize = images.reduce((sum, image) => sum + image.file.size, 0);
  const totalCompressedSize = images.reduce(
    (sum, image) => sum + (image.result?.compressedSize ?? image.file.size),
    0
  );
  const overallRatio =
    totalOriginalSize > 0
      ? Math.max(0, ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100)
      : 0;

  return (
    <section className="pt-2" aria-labelledby="results-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="results-heading" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {images.length} image{images.length === 1 ? '' : 's'}
        </h2>
        {doneCount > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatFileSize(totalOriginalSize)} → {formatFileSize(totalCompressedSize)}
            {' · '}
            <span className="font-semibold text-brand-600 dark:text-brand-400">
              {overallRatio.toFixed(0)}% smaller
            </span>
          </p>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            sourceUrl={sourceUrls.current.get(image.id)?.url ?? ''}
            copyState={copyStatus[image.id] ?? 'idle'}
            clipboardAvailable={clipboardAvailable}
            isProcessing={isProcessing}
            onRemove={onRemove}
            onRetry={onRetry}
            onEditRequest={handleEditRequest}
            onCompareRequest={handleCompareRequest}
            onDownload={handleDownload}
            onCopyImage={handleCopyImage}
          />
        ))}
      </div>

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

      {/* An editor opened before a batch started stays mounted through it, so
          it is explicitly locked down while one runs: applying an edit to an
          image the pipeline is still compressing is what produced the stale
          write-back race. Locked rather than force-closed so the user's
          rotations and filters survive the batch. */}
      {editingImage && (
        <ImageEditor
          file={editingImage.file}
          disabled={isProcessing}
          onSave={(editedFile) => {
            onEdit(editingImage.id, editedFile);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      )}
    </section>
  );
};
