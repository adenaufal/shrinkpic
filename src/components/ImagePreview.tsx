import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  Copy,
  Download,
  Edit2,
  ImagePlus,
  LayoutGrid,
  List,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  copyImageToClipboard,
  downloadFile,
  formatLabelFromMime,
  isClipboardSupported,
  outputFilename,
  type CompressionResult,
} from '../utils/imageCompression';
import { formatFileSize } from '../utils/format';
import { ACCEPT_ATTRIBUTE, MAX_FILES } from '../utils/fileValidation';
import { safeStorage } from '../utils/safeStorage';
import { useCountUp } from '../hooks/useCountUp';
import { ComparisonSlider } from './ComparisonSlider';
import { ProgressBar } from './ui/ProgressBar';
import { ImageEditor } from './ImageEditor';
import type { QueuedImage } from '../types';

type QueueView = 'grid' | 'list';

const VIEW_STORAGE_KEY = 'shrinkpic_view';

/**
 * The saved choice, else grid where there is room for it and list on
 * phones — a one-column grid of tall cards makes a 50-image batch a very
 * long scroll.
 */
const initialView = (): QueueView => {
  const saved = safeStorage.getItem(VIEW_STORAGE_KEY);
  if (saved === 'grid' || saved === 'list') return saved;
  try {
    return window.matchMedia('(min-width: 640px)').matches ? 'grid' : 'list';
  } catch {
    return 'grid';
  }
};

interface ImagePreviewProps {
  images: QueuedImage[];
  onRemove: (id: string) => void;
  onEdit: (id: string, editedFile: File) => void;
  onRetry: (id: string) => void;
  onAddFiles: (files: File[]) => void;
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

interface ItemProps {
  image: QueuedImage;
  /** Position in the queue, used only to stagger the entrance. */
  index: number;
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

// Capped so the 50th item does not wait two seconds to appear.
const staggerStyle = (index: number): React.CSSProperties => ({
  animationDelay: `${Math.min(index, 8) * 45}ms`,
});

/** The logo's press arrow, drawn over a thumbnail while it compresses. */
const PressArrow: React.FC<{ flip?: boolean }> = ({ flip = false }) => (
  <svg viewBox="0 0 24 14" className="h-3.5 w-6 drop-shadow" aria-hidden="true" focusable="false">
    <path
      d={flip ? 'M3 12h18L12 2z' : 'M3 2h18l-9 10z'}
      fill="#fff"
      stroke="#fff"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  </svg>
);

/** Scan band and press arrows over a thumbnail that is compressing. */
const CompressingOverlay: React.FC<{ arrows?: boolean }> = ({ arrows = true }) => (
  <div className="pointer-events-none absolute inset-0 animate-fade-in" aria-hidden="true">
    <div className="absolute inset-0 bg-white/20 dark:bg-black/20" />
    <div className="card-scan" />
    {arrows && (
      <>
        <div className="absolute inset-x-0 top-2 flex justify-center">
          <span className="card-press-top">
            <PressArrow />
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-2 flex justify-center">
          <span className="card-press-bottom">
            <PressArrow flip />
          </span>
        </div>
      </>
    )}
  </div>
);

/**
 * "72% smaller" plus a bar whose filled part is the share that was saved —
 * the same reading as the batch ring. Both count up when the result lands.
 */
const SavingsMeter: React.FC<{ ratio: number }> = ({ ratio }) => {
  const shown = useCountUp(ratio, 900);
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold tabular-nums text-brand-600 dark:text-brand-400">
        {shown.toFixed(0)}% smaller
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" aria-hidden="true">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
          style={{ width: `${Math.max(2, shown)}%` }}
        />
      </div>
    </div>
  );
};

/** What happened to a file that could not be made smaller. */
const keptOriginalText = (result: CompressionResult) =>
  result.formatConversionSkipped && result.requestedOutputType
    ? `Kept the original ${formatLabelFromMime(result.outputType)} — ${formatLabelFromMime(
        result.requestedOutputType
      )} would be larger`
    : 'Already as small as it gets — original kept';

const SizeLine: React.FC<{ image: QueuedImage }> = ({ image }) => (
  <p className="mt-0.5 truncate text-xs tabular-nums text-gray-500 dark:text-gray-400">
    {formatFileSize(image.file.size)}
    {image.result ? ` → ${formatFileSize(image.result.compressedSize)}` : ''}
    {image.status === 'idle' && <span className="text-gray-400 dark:text-gray-500"> · ready</span>}
  </p>
);

const ErrorNote: React.FC<{ image: QueuedImage; compact?: boolean }> = ({ image, compact = false }) => (
  <p
    className={`flex items-start gap-1.5 text-xs leading-snug text-red-700 dark:text-red-300 ${
      compact ? 'mt-1 line-clamp-2' : ''
    }`}
  >
    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    {image.error || 'Compression failed.'}
  </p>
);

const CopyButton: React.FC<{
  image: QueuedImage;
  copyState: CopyState;
  clipboardAvailable: boolean;
  onCopyImage: (id: string) => void;
}> = ({ image, copyState, clipboardAvailable, onCopyImage }) => (
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
);

/**
 * One tile in the grid view, memoized so a progress tick for image A does
 * not re-render tiles B, C, … — `App` writes back per-image results by id
 * via `.map`, so untouched entries keep the same object reference and the
 * default shallow-prop comparison bails out.
 *
 * Motion tells the story: the tile fades up on arrival, the photo loses its
 * colour and is "pressed" while compressing, squishes back when the smaller
 * file lands, and the tile shakes on failure. The one-shot classes restart
 * on their own because each state change adds the class afresh.
 */
const ImageCard: React.FC<ItemProps> = React.memo(function ImageCard({
  image,
  index,
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
  const compressing = image.status === 'processing';

  return (
    <li
      className={`surface lift-hover flex animate-fade-up flex-col overflow-hidden ${
        image.status === 'error' ? 'animate-shake' : ''
      }`}
      style={staggerStyle(index)}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
        {sourceUrl && (
          <img
            src={result?.url || sourceUrl}
            alt={image.file.name}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition-[filter,transform] duration-500 ${
              compressing ? 'scale-[0.97] saturate-[0.35]' : ''
            } ${image.status === 'done' ? 'animate-squish' : ''}`}
          />
        )}

        {compressing && <CompressingOverlay />}

        {/* Visual echo of the text below it, so hidden from assistive tech. */}
        {result && (
          <span
            aria-hidden="true"
            className={`absolute left-2 top-2 animate-pop-in rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm [animation-delay:150ms] ${
              result.alreadyOptimized
                ? 'bg-white/90 text-gray-700 dark:bg-dark-bg/90 dark:text-gray-200'
                : 'bg-gradient-to-r from-brand-600 to-violet-600 text-white'
            }`}
          >
            {result.alreadyOptimized ? 'Original kept' : `−${result.compressionRatio.toFixed(0)}%`}
          </span>
        )}

        <div className="absolute right-2 top-2 flex gap-1">
          {!result && !compressing && (
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

      <div className="flex flex-1 flex-col p-3">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100" title={image.file.name}>
          {image.file.name}
        </p>
        <SizeLine image={image} />

        {compressing && (
          <div className="mt-2.5">
            <p className="mb-1.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">
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
          <div className="mt-2.5 rounded-xl border border-red-200 bg-red-50 p-2.5 dark:border-red-900 dark:bg-red-950/40">
            <ErrorNote image={image} />
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

        {result &&
          (result.alreadyOptimized ? (
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{keptOriginalText(result)}</p>
          ) : (
            <SavingsMeter ratio={result.compressionRatio} />
          ))}

        {result && (
          // Pinned to the bottom so buttons line up across a row of tiles
          // whose text runs to different lengths.
          <div className="mt-auto flex gap-2 pt-3">
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
            <CopyButton
              image={image}
              copyState={copyState}
              clipboardAvailable={clipboardAvailable}
              onCopyImage={onCopyImage}
            />
          </div>
        )}
      </div>
    </li>
  );
});

/**
 * One row in the list view: the dense layout for big batches and phones.
 * Below `sm` a finished row wraps its buttons onto a second, full-width line
 * so every target stays 44px without squeezing the file name to nothing.
 */
const ImageRow: React.FC<ItemProps> = React.memo(function ImageRow({
  image,
  index,
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
  const compressing = image.status === 'processing';

  const removeButton = (className = '') => (
    <button
      type="button"
      onClick={() => onRemove(image.id)}
      disabled={isProcessing}
      className={`btn btn-ghost btn-icon ${className}`}
      aria-label={`Remove ${image.file.name}`}
      title={isProcessing ? 'Available once compression finishes' : 'Remove image'}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  return (
    <li
      className={`surface lift-hover flex animate-fade-up flex-wrap items-center gap-3 p-2.5 sm:flex-nowrap sm:gap-4 sm:p-3 ${
        image.status === 'error' ? 'animate-shake' : ''
      }`}
      style={staggerStyle(index)}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 sm:w-24">
        {sourceUrl && (
          <img
            src={result?.url || sourceUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition-[filter,transform] duration-500 ${
              compressing ? 'scale-[0.97] saturate-[0.35]' : ''
            } ${image.status === 'done' ? 'animate-squish' : ''}`}
          />
        )}
        {compressing && <CompressingOverlay arrows={false} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100" title={image.file.name}>
          {image.file.name}
        </p>
        <SizeLine image={image} />

        {compressing && (
          <div className="mt-2" aria-hidden="true">
            <ProgressBar progress={image.progress || 0} />
          </div>
        )}
        {image.status === 'error' && <ErrorNote image={image} compact />}
        {result &&
          (result.alreadyOptimized ? (
            <p className="mt-1 truncate text-xs text-gray-600 dark:text-gray-400">Original kept</p>
          ) : (
            <SavingsMeter ratio={result.compressionRatio} />
          ))}
      </div>

      {/* A finished row on a phone: Remove moves up beside the name, so the
          wrapped button line keeps room for a readable Download label. */}
      {result && removeButton('-mr-1 -mt-1 self-start sm:hidden')}

      {result ? (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => onDownload(image.id)}
            className="btn btn-primary min-w-0 flex-1 sm:btn-icon sm:flex-none xl:w-auto xl:px-4"
            aria-label={`Download ${image.file.name}`}
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate sm:hidden xl:inline">Download</span>
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
          <CopyButton
            image={image}
            copyState={copyState}
            clipboardAvailable={clipboardAvailable}
            onCopyImage={onCopyImage}
          />
          {removeButton('hidden sm:inline-flex')}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {image.status === 'error' && (
            <button
              type="button"
              onClick={() => onRetry(image.id)}
              disabled={isProcessing}
              className="btn btn-danger btn-icon"
              aria-label={`Retry ${image.file.name}`}
              title="Retry"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {image.status === 'idle' && (
            <button
              type="button"
              onClick={() => onEditRequest(image.id)}
              disabled={isProcessing}
              className="btn btn-ghost btn-icon"
              aria-label={`Edit ${image.file.name}`}
              title={isProcessing ? 'Available once compression finishes' : 'Edit image'}
            >
              <Edit2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {removeButton()}
        </div>
      )}
    </li>
  );
});

const VIEW_OPTIONS: { value: QueueView; label: string; icon: typeof LayoutGrid }[] = [
  { value: 'grid', label: 'Grid view', icon: LayoutGrid },
  { value: 'list', label: 'List view', icon: List },
];

/**
 * The queue: a toolbar (count, add more, layout switch) over the images in
 * a grid or a list, plus the per-image modals.
 */
export const ImagePreview: React.FC<ImagePreviewProps> = ({
  images,
  onRemove,
  onEdit,
  onRetry,
  onAddFiles,
  isProcessing,
  onModalOpenChange,
}) => {
  const [copyStatus, setCopyStatus] = useState<Record<string, CopyState>>({});
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<QueueView>(initialView);

  const changeView = (next: QueueView) => {
    setView(next);
    safeStorage.setItem(VIEW_STORAGE_KEY, next);
  };

  // Latest `images` without making every callback below depend on (and
  // change identity with) the array itself — that would defeat the items'
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
  const full = images.length >= MAX_FILES;
  const Item = view === 'grid' ? ImageCard : ImageRow;

  return (
    <section className="min-w-0 animate-fade-up [animation-delay:120ms]" aria-labelledby="queue-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="queue-heading" className="flex items-baseline gap-2 text-base font-semibold text-gray-900 dark:text-gray-50">
          Queue
          <span className="text-sm font-normal tabular-nums text-gray-500 dark:text-gray-400">
            {images.length} / {MAX_FILES}
          </span>
        </h2>

        <div className="flex items-center gap-2">
          {/* The input sits inside its label, so the whole button opens the
              picker and keyboard focus lands on a real file input. */}
          <label
            className={`btn btn-secondary btn-icon cursor-pointer focus-within:ring-2 focus-within:ring-brand-500 sm:w-auto sm:px-3 ${
              isProcessing || full ? 'pointer-events-none opacity-50' : ''
            }`}
            title={full ? `The queue holds ${MAX_FILES} images at most` : 'Add images — or drop / paste them anywhere'}
          >
            <input
              type="file"
              multiple
              accept={ACCEPT_ATTRIBUTE}
              disabled={isProcessing || full}
              className="sr-only"
              aria-label="Add images"
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                // Reset so re-picking the same file fires `change` again.
                event.target.value = '';
                if (files.length > 0) onAddFiles(files);
              }}
            />
            <ImagePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Add images</span>
          </label>

          <div
            role="group"
            aria-label="Layout"
            className="flex rounded-xl border border-gray-200 p-1 dark:border-dark-border"
          >
            {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => changeView(value)}
                aria-pressed={view === value}
                aria-label={label}
                title={label}
                className={`grid h-9 w-9 place-items-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  view === value
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <ul
        className={
          view === 'grid'
            ? 'mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'
            : 'mt-4 flex flex-col gap-2'
        }
      >
        {images.map((image, index) => (
          <Item
            key={image.id}
            index={index}
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
      </ul>

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
