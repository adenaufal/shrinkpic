import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { SiteFooter } from './components/SiteFooter';
import { FileUpload } from './components/FileUpload';
import { CompressionControls } from './components/CompressionControls';
import { ImagePreview } from './components/ImagePreview';
import { HistoryPanel } from './components/HistoryPanel';
import {
  copyImageToClipboard,
  downloadFile,
  outputFilename,
  resolveOutputFormat,
  revokeResultUrl,
  type OutputFormat,
} from './utils/imageCompression';
import { formatFileSize, createId } from './utils/format';
import { getDefaultPreset, getPresetById } from './utils/presets';
import { validateFiles } from './utils/fileValidation';
import { isSameQueueEntry, updateQueueEntry } from './utils/queue';
import { getCompressionConcurrency, runWithConcurrency } from './utils/concurrency';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCompressionHistory } from './hooks/useCompressionHistory';
import { useCompressionWorker } from './hooks/useCompressionWorker';
import type { QueuedImage } from './types';

function App() {
  const defaultPreset = getDefaultPreset();
  const [images, setImages] = useState<QueuedImage[]>([]);
  const [quality, setQuality] = useState(defaultPreset.quality);
  const [maxWidth, setMaxWidth] = useState(defaultPreset.maxWidth);
  const [format, setFormat] = useState<OutputFormat>(defaultPreset.format);
  const [selectedPreset, setSelectedPreset] = useState(defaultPreset.id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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

  // Mirror of `images` for cleanup paths that must not re-run on every change.
  const imagesRef = useRef<QueuedImage[]>(images);
  useEffect(() => {
    imagesRef.current = images;
  });

  // Compressed blobs are held alive by their object URLs; release everything
  // outstanding when the app goes away.
  useEffect(
    () => () => {
      imagesRef.current.forEach((image) => revokeResultUrl(image.result));
    },
    []
  );

  const handlePresetChange = useCallback((presetId: string) => {
    setSelectedPreset(presetId);
    const preset = getPresetById(presetId);
    if (presetId !== 'custom' && preset) {
      setQuality(preset.quality);
      setMaxWidth(preset.maxWidth);
      setFormat(preset.format);
    }
  }, []);

  const handleFileSelect = useCallback((files: File[]) => {
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
  }, []);

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

  const handleClearAll = useCallback(() => {
    const count = imagesRef.current.length;
    imagesRef.current.forEach((image) => revokeResultUrl(image.result));
    setImages([]);
    if (count > 0) {
      toast.success(`Cleared ${count} image${count > 1 ? 's' : ''}`);
    }
  }, []);

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

      setIsProcessing(true);
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

      const loadingToast = toast.loading(
        `Compressing ${targets.length} image${targets.length > 1 ? 's' : ''}...`
      );

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
            `Compressed ${succeeded.length}, ${failed} failed — see the highlighted cards to retry.`,
            { duration: 6000 }
          );
          setAnnouncement(message);
        } else {
          const message = 'Compression failed — see the highlighted cards for details.';
          toast.error(message, { duration: 6000 });
          setAnnouncement(message);
        }
      } finally {
        // In the finally block, not the happy path: `toast.loading` has no
        // duration, so a throw anywhere above would otherwise leave
        // "Compressing N images..." spinning on screen for good.
        toast.dismiss(loadingToast);
        setIsProcessing(false);
      }
    },
    [addSession, compress, concurrency, format, maxWidth, quality]
  );

  const handleCompress = useCallback(() => {
    if (isProcessing) return;
    void runCompression(imagesRef.current);
  }, [isProcessing, runCompression]);

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

  const hasResults = images.some((image) => image.result);
  const totalOriginalSize = images.reduce((sum, image) => sum + image.file.size, 0);
  const totalCompressedSize = images.reduce(
    (sum, image) => sum + (image.result?.compressedSize ?? image.file.size),
    0
  );
  const overallCompressionRatio =
    totalOriginalSize > 0
      ? Math.max(0, ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100)
      : 0;

  // Global shortcuts stand down while any modal is up: Delete would otherwise
  // clear the queue from inside the image editor (taking the unsaved edit with
  // it) and Ctrl+Enter would start a batch behind the open dialog.
  const anyModalOpen = showHistory || previewModalOpen;

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
    ],
    !anyModalOpen
  );

  const controls = (
    <CompressionControls
      quality={quality}
      onQualityChange={setQuality}
      maxWidth={maxWidth}
      onMaxWidthChange={setMaxWidth}
      format={format}
      onFormatChange={setFormat}
      selectedPreset={selectedPreset}
      onPresetChange={handlePresetChange}
      onCompress={handleCompress}
      onDownloadAll={handleDownloadAll}
      onDownloadAsZip={handleDownloadAsZip}
      onCopyImage={handleCopyImage}
      onClearAll={handleClearAll}
      isProcessing={isProcessing}
      hasImages={images.length > 0}
      hasResults={hasResults}
    />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-dark-bg dark:via-gray-900 dark:to-dark-bg font-sans transition-colors duration-300">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Batch-level status only — per-card progress is aria-hidden so a
          screen reader hears one coherent update instead of a flood. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="container mx-auto px-4 py-8">
        <Header historyCount={history.length} onOpenHistory={() => setShowHistory(true)} />

        <div className="max-w-6xl mx-auto">
          {/* The pitch stays above the tool, but collapses to one line once the
              queue is busy so the uploader is never pushed below the fold. */}
          <Hero compact={images.length > 0} />
        </div>

        <main id="main-content" className="max-w-6xl mx-auto mt-8">
          {/* Controls sit above the grid on small screens, in the sidebar on desktop. */}
          {images.length > 0 && <div className="lg:hidden mb-8">{controls}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <FileUpload
                onFileSelect={handleFileSelect}
                isProcessing={isProcessing}
                hasImages={images.length > 0}
              />

              {hasResults && (
                <div className="bg-white dark:bg-dark-card rounded-2xl p-6 border border-gray-200 dark:border-dark-border shadow-sm animate-fade-in">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Compression Summary
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Total Original Size:</span>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatFileSize(totalOriginalSize)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Total Compressed Size:</span>
                      <div className="font-semibold text-green-600 dark:text-green-400">
                        {formatFileSize(totalCompressedSize)}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600 dark:text-gray-400">Overall Space Saved:</span>
                      <div className="font-bold text-green-600 dark:text-green-400 text-lg">
                        {overallCompressionRatio.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {images.length > 0 && (
                <ImagePreview
                  images={images}
                  onRemove={handleRemoveImage}
                  onEdit={handleEditImage}
                  onRetry={handleRetry}
                  isProcessing={isProcessing}
                  onModalOpenChange={setPreviewModalOpen}
                />
              )}
            </div>

            <div className="hidden lg:block">{controls}</div>
          </div>
        </main>

        <div className="max-w-6xl mx-auto">
          <SiteFooter />
        </div>
      </div>

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
    </div>
  );
}

export default App;
