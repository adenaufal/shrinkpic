import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';
import { Header } from './components/Header';
import { Landing } from './components/Landing';
import { SiteFooter } from './components/SiteFooter';
import { CompressionControls } from './components/CompressionControls';
import { ActionBar } from './components/ActionBar';
import { BatchPanel, type BatchProgress } from './components/BatchPanel';
import { ImagePreview } from './components/ImagePreview';
import { HistoryPanel } from './components/HistoryPanel';
import { DropOverlay } from './components/DropOverlay';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { Backdrop } from './components/art/Backdrop';
import { StickyAside } from './components/ui/StickyAside';
import {
  copyImageToClipboard,
  downloadFile,
  outputFilename,
  resolveOutputFormat,
  revokeResultUrl,
  type OutputFormat,
} from './utils/imageCompression';
import { createId } from './utils/format';
import { getDefaultPreset, getPresetById } from './utils/presets';
import { validateFiles } from './utils/fileValidation';
import { isSameQueueEntry, updateQueueEntry } from './utils/queue';
import { getCompressionConcurrency, runWithConcurrency } from './utils/concurrency';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCompressionHistory } from './hooks/useCompressionHistory';
import { useCompressionWorker } from './hooks/useCompressionWorker';
import { useGlobalFileDrop } from './hooks/useGlobalFileDrop';
import { usePasteImages } from './hooks/usePasteImages';
import type { QueuedImage } from './types';

interface RunSettings {
  quality: number;
  maxWidth: number;
  format: OutputFormat;
}

/** Whether results made with `previous` still match the current settings. */
const sameSettings = (previous: RunSettings, current: RunSettings): boolean =>
  previous.format === current.format &&
  previous.maxWidth === current.maxWidth &&
  // PNG is lossless: the quality slider has no effect on it.
  (current.format === 'png' || previous.quality === current.quality);

/** How long "Clear" can be undone. */
const UNDO_MS = 6000;

interface ClearedBatch {
  images: QueuedImage[];
  toastId: string;
  timer: number;
}

function App() {
  const defaultPreset = getDefaultPreset();
  const [images, setImages] = useState<QueuedImage[]>([]);
  const [quality, setQuality] = useState(defaultPreset.quality);
  const [maxWidth, setMaxWidth] = useState(defaultPreset.maxWidth);
  const [format, setFormat] = useState<OutputFormat>(defaultPreset.format);
  const [selectedPreset, setSelectedPreset] = useState(defaultPreset.id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // The settings the current results were made with — compared against the
  // live settings to tell the user their results are out of date.
  const [lastRun, setLastRun] = useState<RunSettings | null>(null);
  // Progress of the run in flight, for the batch panel and the tab title.
  const [batch, setBatch] = useState<BatchProgress | null>(null);
  // The queue's modals (editor, comparison) live inside ImagePreview; it
  // reports them up so the global shortcuts can stand down while one is open.
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  // A single visually-hidden live region for batch-level status. Per-card
  // progress bars are `aria-hidden` — six announcements per image would
  // spam a screen reader far more than it would help.
  const [announcement, setAnnouncement] = useState('');

  const { history, addSession, deleteSession, clearHistory } = useCompressionHistory();
  const { compress } = useCompressionWorker();
  const concurrency = useMemo(() => getCompressionConcurrency(), []);
  const { dragging, endDrag } = useGlobalFileDrop();

  // Mirror of `images` for cleanup paths that must not re-run on every change.
  const imagesRef = useRef<QueuedImage[]>(images);
  useEffect(() => {
    imagesRef.current = images;
  });

  // A cleared queue is parked here, result URLs and all, until its undo
  // window closes.
  const clearedRef = useRef<ClearedBatch | null>(null);

  // Compressed blobs are held alive by their object URLs; release everything
  // outstanding when the app goes away.
  useEffect(
    () => () => {
      imagesRef.current.forEach((image) => revokeResultUrl(image.result));
      clearedRef.current?.images.forEach((image) => revokeResultUrl(image.result));
    },
    []
  );

  // Progress in the tab title, for the batch running in a background tab.
  const baseTitle = useRef(document.title);
  useEffect(() => {
    document.title = batch
      ? `(${batch.finished}/${batch.total}) Compressing… · Shrinkpic`
      : baseTitle.current;
  }, [batch]);

  /** Makes a pending "Clear" permanent: its result URLs are released. */
  const commitClear = useCallback(() => {
    const cleared = clearedRef.current;
    if (!cleared) return;
    window.clearTimeout(cleared.timer);
    toast.dismiss(cleared.toastId);
    cleared.images.forEach((image) => revokeResultUrl(image.result));
    clearedRef.current = null;
  }, []);

  const undoClear = useCallback(() => {
    const cleared = clearedRef.current;
    if (!cleared) return;
    window.clearTimeout(cleared.timer);
    toast.dismiss(cleared.toastId);
    clearedRef.current = null;
    setImages(cleared.images);
  }, []);

  const handlePresetChange = useCallback((presetId: string) => {
    setSelectedPreset(presetId);
    const preset = getPresetById(presetId);
    if (presetId !== 'custom' && preset) {
      setQuality(preset.quality);
      setMaxWidth(preset.maxWidth);
      setFormat(preset.format);
    }
  }, []);

  const handleFileSelect = useCallback(
    (files: File[]) => {
      // New work closes the undo window on a cleared queue — restoring it
      // on top of fresh images would blow past the queue limit.
      commitClear();

      const { accepted, errors } = validateFiles(files, imagesRef.current.length);

      errors.forEach((message) => toast.error(message, { duration: 5000 }));

      if (accepted.length === 0) return;

      const queued = accepted.map<QueuedImage>((file) => ({
        id: createId(),
        file,
        status: 'idle',
      }));

      setImages((prev) => [...prev, ...queued]);
      toast.success(`${accepted.length} image${accepted.length > 1 ? 's' : ''} added`);
    },
    [commitClear]
  );

  // Paste and drop can arrive mid-batch, when the pickers are disabled.
  const isProcessingRef = useRef(isProcessing);
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  });

  usePasteImages((files) => {
    if (isProcessingRef.current) {
      toast('Wait for the current batch to finish, then paste again.', { icon: '⏳' });
      return;
    }
    handleFileSelect(files);
  });

  const handleRemoveImage = useCallback((id: string) => {
    const target = imagesRef.current.find((image) => image.id === id);
    revokeResultUrl(target?.result);
    setImages((prev) => prev.filter((image) => image.id !== id));
  }, []);

  const handleEditImage = useCallback((id: string, editedFile: File) => {
    const target = imagesRef.current.find((image) => image.id === id);
    revokeResultUrl(target?.result);
    setImages((prev) =>
      prev.map((image) =>
        image.id === id
          ? { id: image.id, file: editedFile, status: 'idle', progress: undefined, result: undefined, error: undefined }
          : image
      )
    );
    toast.success('Image edited successfully');
  }, []);

  // Delete clears everything in one keystroke, so it is undoable rather than
  // confirmed: the results stay alive for a few seconds behind an Undo toast.
  const handleClearAll = useCallback(() => {
    const cleared = imagesRef.current;
    if (cleared.length === 0) return;
    commitClear();
    setImages([]);

    const count = cleared.length;
    const toastId = toast(
      () => (
        <span className="flex items-center gap-3">
          Cleared {count} image{count > 1 ? 's' : ''}
          <button
            type="button"
            onClick={undoClear}
            className="rounded-md px-2 py-1 font-semibold text-brand-300 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            Undo
          </button>
        </span>
      ),
      { duration: UNDO_MS }
    );
    clearedRef.current = {
      images: cleared,
      toastId,
      timer: window.setTimeout(commitClear, UNDO_MS),
    };
  }, [commitClear, undoClear]);

  const runCompression = useCallback(
    async (targets: QueuedImage[]) => {
      if (targets.length === 0) return;

      const outputFormat = resolveOutputFormat(format);
      if (outputFormat !== format) {
        toast(`${format.toUpperCase()} encoding is not supported in this browser — using JPEG.`, {
          icon: '⚠️',
          duration: 5000,
        });
      }

      // A run over the whole queue defines what "current results" means. A
      // partial run (new images, one retry) leaves that alone, so a retry
      // made under different settings still reads as out of date.
      if (targets.length === imagesRef.current.length) {
        setLastRun({ quality, maxWidth, format: outputFormat });
      }

      setIsProcessing(true);
      setBatch({ total: targets.length, finished: 0 });
      setAnnouncement(`Compressing ${targets.length} image${targets.length > 1 ? 's' : ''}…`);

      // Drop the previous results (and their object URLs) before re-running.
      targets.forEach((target) => revokeResultUrl(target.result));
      const targetIds = new Set(targets.map((target) => target.id));
      setImages((prev) =>
        prev.map((image) =>
          targetIds.has(image.id)
            ? { ...image, status: 'processing', progress: 0, result: undefined, error: undefined }
            : image
        )
      );

      const countFinished = () =>
        setBatch((current) => (current ? { ...current, finished: current.finished + 1 } : current));

      try {
        // A bounded pool: every in-flight image holds a decoded bitmap, so
        // starting them all at once is how tabs die.
        const settled = await runWithConcurrency(targets, concurrency, async (target) => {
          try {
            const result = await compress(target.file, {
              quality,
              maxWidth,
              format: outputFormat,
              onProgress: (progress) => {
                setImages((prev) => updateQueueEntry(prev, target, { progress }));
              },
            });

            // Matched on id *and* File: an edit applied while the batch was
            // running replaces the File in place, and writing this (pre-edit)
            // result back would show the wrong bytes, size and ratio under the
            // edited image — and ship them in the download and the ZIP.
            setImages((prev) =>
              updateQueueEntry(prev, target, {
                result,
                status: 'done',
                progress: 100,
                error: undefined,
              })
            );

            // That write-back is a no-op when the entry was edited or removed
            // mid-batch. Nothing owns this blob URL then, so release it.
            if (!imagesRef.current.some((image) => isSameQueueEntry(image, target))) {
              revokeResultUrl(result);
            }

            return { target, result, error: null as string | null };
          } catch (error) {
            console.error('Compression failed for', target.file.name, error);
            const message =
              error instanceof Error
                ? error.message
                : `Could not compress "${target.file.name}".`;

            setImages((prev) =>
              updateQueueEntry(prev, target, {
                status: 'error',
                progress: 0,
                result: undefined,
                error: message,
              })
            );

            return { target, result: null, error: message };
          } finally {
            countFinished();
          }
        });

        const outcomes = settled.flatMap((entry) =>
          entry.status === 'fulfilled' ? [entry.value] : []
        );
        const succeeded = outcomes.filter((outcome) => outcome.result);
        const failed = outcomes.length - succeeded.length;

        if (succeeded.length > 0) {
          // Built from the settled results, not from component state — the
          // state write-backs have not necessarily landed yet.
          addSession(
            outcomes.map((outcome) => ({
              fileName: outcome.target.file.name,
              originalSize: outcome.target.file.size,
              compressedSize: outcome.result?.compressedSize,
              compressionRatio: outcome.result?.compressionRatio,
              outputType: outcome.result?.outputType,
            })),
            { quality, maxWidth, format: outputFormat }
          );
        }

        if (failed === 0) {
          const message = `Compressed ${succeeded.length} image${succeeded.length > 1 ? 's' : ''}`;
          toast.success(message);
          setAnnouncement(message);
        } else if (succeeded.length > 0) {
          const message = `Finished: ${succeeded.length} compressed, ${failed} failed`;
          toast.error(
            `Compressed ${succeeded.length}, ${failed} failed — see the highlighted images to retry.`,
            { duration: 6000 }
          );
          setAnnouncement(message);
        } else {
          const message = 'Compression failed — see the highlighted images for details.';
          toast.error(message, { duration: 6000 });
          setAnnouncement(message);
        }
      } finally {
        // In the finally block, not the happy path: a throw anywhere above
        // would otherwise leave the whole UI locked in its busy state.
        setBatch(null);
        setIsProcessing(false);
      }
    },
    [addSession, compress, concurrency, format, maxWidth, quality]
  );

  const hasResults = images.some((image) => image.result);
  const hasImages = images.length > 0;
  const pendingCount = images.filter((image) => !image.result).length;
  const settingsChanged =
    hasResults &&
    lastRun !== null &&
    !sameSettings(lastRun, { quality, maxWidth, format: resolveOutputFormat(format) });

  // Compress only what needs it: new or failed images when the settings are
  // unchanged, the whole queue when they changed (or when everything is
  // already done and the user asks again).
  const handleCompress = useCallback(() => {
    if (isProcessing) return;
    const all = imagesRef.current;
    const pending = all.filter((image) => !image.result);
    void runCompression(settingsChanged || pending.length === 0 ? all : pending);
  }, [isProcessing, runCompression, settingsChanged]);

  const handleRetry = useCallback(
    (id: string) => {
      if (isProcessing) return;
      const target = imagesRef.current.find((image) => image.id === id);
      if (target) {
        void runCompression([target]);
      }
    },
    [isProcessing, runCompression]
  );

  const handleDownloadAll = useCallback(async () => {
    const ready = imagesRef.current.filter((image) => image.result);
    if (ready.length === 0) {
      toast.error('No compressed images to download');
      return;
    }

    // Browsers throttle or block bursts of anchor clicks, so they are staggered
    // and the ZIP export stays the recommended path for larger batches.
    for (let i = 0; i < ready.length; i += 1) {
      const image = ready[i];
      downloadFile(image.result!.blob, outputFilename(image.file.name, image.result!.outputType));
      if (i < ready.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    toast.success(
      ready.length > 3
        ? `Downloading ${ready.length} images — use "Download as ZIP" if your browser blocks some.`
        : `Downloaded ${ready.length} image${ready.length > 1 ? 's' : ''}`
    );
  }, []);

  const handleCopyImage = useCallback(async () => {
    const ready = imagesRef.current.filter((image) => image.result);
    if (ready.length === 0) {
      toast.error('No compressed images to copy');
      return;
    }

    const [first] = ready;
    try {
      const copiedType = await copyImageToClipboard(first.result!.blob);
      const asPng = copiedType === 'image/png' && first.result!.outputType !== 'image/png';
      const suffix = ready.length > 1 ? ' (the clipboard holds one image at a time)' : '';
      toast.success(
        `Copied "${first.file.name}"${asPng ? ' as PNG' : ''} to the clipboard${suffix}`
      );
    } catch (error) {
      console.error('Failed to copy image:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to copy the image to the clipboard'
      );
    }
  }, []);

  const handleDownloadAsZip = useCallback(async () => {
    const compressedImages = imagesRef.current
      .filter((image) => image.result)
      .map((image) => ({
        blob: image.result!.blob,
        filename: outputFilename(image.file.name, image.result!.outputType),
      }));

    if (compressedImages.length === 0) {
      toast.error('No compressed images to download');
      return;
    }

    const zipLoadingToast = toast.loading('Creating ZIP file...');
    try {
      // Dynamically imported so JSZip and file-saver — dead weight for
      // everyone who never exports a ZIP — split into their own chunk
      // instead of loading on first paint.
      const { exportToZip } = await import('./utils/zipExport');
      await exportToZip(compressedImages, 'compressed-images.zip');
      toast.dismiss(zipLoadingToast);
      toast.success(
        `Downloaded ${compressedImages.length} image${compressedImages.length > 1 ? 's' : ''} as ZIP`
      );
    } catch (error) {
      toast.dismiss(zipLoadingToast);
      console.error('Failed to create ZIP:', error);
      toast.error('Failed to create ZIP file');
    }
  }, []);

  // Global shortcuts stand down while any modal is up: Delete would otherwise
  // clear the queue from inside the image editor (taking the unsaved edit with
  // it) and Ctrl+Enter would start a batch behind the open dialog.
  const anyModalOpen = showHistory || showShortcuts || previewModalOpen;

  useKeyboardShortcuts(
    [
      {
        key: 'Enter',
        ctrl: true,
        action: () => {
          if (images.length > 0 && !isProcessing) {
            handleCompress();
          }
        },
        description: 'Compress images',
      },
      {
        key: 's',
        ctrl: true,
        action: () => {
          if (hasResults) {
            void handleDownloadAsZip();
          }
        },
        description: 'Download as ZIP',
      },
      {
        key: 'c',
        ctrl: true,
        shift: true,
        action: () => {
          if (hasResults) {
            void handleCopyImage();
          }
        },
        description: 'Copy compressed image',
      },
      {
        key: 'd',
        ctrl: true,
        shift: true,
        action: () => {
          if (hasResults) {
            void handleDownloadAll();
          }
        },
        description: 'Download all images',
      },
      {
        key: 'Delete',
        action: () => {
          if (images.length > 0 && !isProcessing) {
            handleClearAll();
          }
        },
        description: 'Clear all images',
      },
      {
        key: 'h',
        ctrl: true,
        action: () => setShowHistory(true),
        description: 'View history',
      },
      {
        key: '?',
        shift: true,
        action: () => setShowShortcuts(true),
        description: 'Show keyboard shortcuts',
      },
    ],
    !anyModalOpen
  );

  return (
    // `isolate` gives the backdrop's negative z-index a floor: it paints above
    // this element's background instead of disappearing behind the page. The
    // column layout with a growing <main> keeps the footer at the bottom of
    // the window when the content is short. The bottom padding reserves room
    // for the fixed action bar below `lg`.
    <div
      className={`relative isolate flex min-h-screen flex-col bg-gray-50 font-sans text-gray-900 dark:bg-dark-bg dark:text-gray-100 ${
        hasImages ? 'pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0' : ''
      }`}
    >
      <Backdrop />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* Batch-level status only — per-card progress is aria-hidden so a
          screen reader hears one coherent update instead of a flood. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <Header
        historyCount={history.length}
        onOpenHistory={() => setShowHistory(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
        busy={isProcessing}
      />

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 sm:px-6 lg:px-8">
        {hasImages ? (
          // The workspace. Below `lg`: batch card, folded settings, queue —
          // with the actions pinned to the bottom of the screen. From `lg`:
          // a sidebar (batch, actions, settings) that stays in view while
          // the queue scrolls beside it.
          <div className="grid gap-4 pt-4 sm:pt-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-8 lg:pt-8 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <h1 className="sr-only">Compress images in your browser</h1>

            <StickyAside className="flex flex-col gap-4" aria-label="Batch and settings">
              <BatchPanel images={images} isProcessing={isProcessing} batch={batch}>
                <ActionBar
                  onCompress={handleCompress}
                  onDownloadAll={handleDownloadAll}
                  onDownloadAsZip={handleDownloadAsZip}
                  onClearAll={handleClearAll}
                  isProcessing={isProcessing}
                  imageCount={images.length}
                  hasResults={hasResults}
                  pendingCount={pendingCount}
                  settingsChanged={settingsChanged}
                />
              </BatchPanel>

              <CompressionControls
                quality={quality}
                onQualityChange={setQuality}
                maxWidth={maxWidth}
                onMaxWidthChange={setMaxWidth}
                format={format}
                onFormatChange={setFormat}
                selectedPreset={selectedPreset}
                onPresetChange={handlePresetChange}
              />

              <p className="hidden items-center gap-2 px-1 text-xs text-gray-500 dark:text-gray-400 lg:flex">
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Every file is processed on this device. Nothing is uploaded.
              </p>
            </StickyAside>

            <ImagePreview
              images={images}
              onRemove={handleRemoveImage}
              onEdit={handleEditImage}
              onRetry={handleRetry}
              onAddFiles={handleFileSelect}
              isProcessing={isProcessing}
              onModalOpenChange={setPreviewModalOpen}
            />
          </div>
        ) : (
          <Landing onFileSelect={handleFileSelect} isProcessing={isProcessing} />
        )}
      </main>

      <SiteFooter />

      <DropOverlay
        open={dragging}
        busy={isProcessing}
        onDropFiles={handleFileSelect}
        onClose={endDrag}
      />

      <HistoryPanel
        open={showHistory}
        onOpenChange={setShowHistory}
        history={history}
        onDeleteSession={deleteSession}
        onClearHistory={() => {
          clearHistory();
          toast.success('History cleared');
        }}
      />

      <ShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
    </div>
  );
}

export default App;
