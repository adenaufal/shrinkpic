import { useCallback, useEffect, useRef } from 'react';
import {
  CompressionOptions,
  CompressionResult,
  EncodedImage,
  compressImage as compressOnMainThread,
  finalizeResult,
  resolveOutputFormat,
  COMPRESSION_TIMEOUT_MS,
} from '../utils/imageCompression';
import { getCompressionConcurrency } from '../utils/concurrency';
import { createId } from '../utils/format';

interface PendingJob {
  resolve: (encoded: EncodedImage) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
  timeoutId: number;
}

/**
 * OffscreenCanvas + createImageBitmap are what make worker-side encoding
 * possible at all. Where they are missing (older Safari, some WebViews) we
 * transparently use the main-thread path instead.
 */
const isWorkerPipelineSupported = (): boolean => {
  try {
    return (
      typeof Worker !== 'undefined' &&
      typeof OffscreenCanvas !== 'undefined' &&
      typeof createImageBitmap === 'function' &&
      typeof new OffscreenCanvas(1, 1).convertToBlob === 'function'
    );
  } catch {
    return false;
  }
};

/**
 * Compresses images in a small pool of workers so the main thread stays
 * responsive, falling back to the main-thread encoder whenever the worker
 * pipeline is unavailable or a single file fails inside it.
 */
export const useCompressionWorker = () => {
  const workersRef = useRef<Worker[]>([]);
  const pendingRef = useRef<Map<string, PendingJob>>(new Map());
  const nextWorkerRef = useRef(0);
  const supportedRef = useRef(false);

  useEffect(() => {
    const pending = pendingRef.current;

    if (!isWorkerPipelineSupported()) {
      return;
    }

    const poolSize = getCompressionConcurrency();
    const workers: Worker[] = [];

    const settle = (id: string, apply: (job: PendingJob) => void) => {
      const job = pending.get(id);
      if (!job) return;
      apply(job);
    };

    try {
      for (let i = 0; i < poolSize; i += 1) {
        const worker = new Worker(new URL('../workers/compression.worker.ts', import.meta.url), {
          type: 'module',
        });

        worker.onmessage = (event: MessageEvent) => {
          const { type, id } = event.data ?? {};
          if (!id) return;

          if (type === 'progress') {
            settle(id, (job) => job.onProgress?.(event.data.progress));
            return;
          }

          if (type === 'result') {
            settle(id, (job) => {
              window.clearTimeout(job.timeoutId);
              pending.delete(id);
              job.resolve(event.data.encoded as EncodedImage);
            });
            return;
          }

          if (type === 'error') {
            settle(id, (job) => {
              window.clearTimeout(job.timeoutId);
              pending.delete(id);
              job.reject(new Error(event.data.error || 'Compression failed in worker.'));
            });
          }
        };

        worker.onerror = () => {
          pending.forEach((job, id) => {
            window.clearTimeout(job.timeoutId);
            pending.delete(id);
            job.reject(new Error('The compression worker crashed.'));
          });
        };

        workers.push(worker);
      }

      workersRef.current = workers;
      supportedRef.current = true;
    } catch (error) {
      console.warn('Falling back to main-thread compression:', error);
      workers.forEach((worker) => worker.terminate());
      workersRef.current = [];
      supportedRef.current = false;
    }

    return () => {
      workersRef.current.forEach((worker) => worker.terminate());
      workersRef.current = [];
      supportedRef.current = false;
      pending.forEach((job) => window.clearTimeout(job.timeoutId));
      pending.clear();
    };
  }, []);

  const encodeInWorker = useCallback(
    (file: File, options: CompressionOptions): Promise<EncodedImage> =>
      new Promise<EncodedImage>((resolve, reject) => {
        const workers = workersRef.current;
        if (!supportedRef.current || workers.length === 0) {
          reject(new Error('Worker pipeline unavailable.'));
          return;
        }

        const id = createId();
        const worker = workers[nextWorkerRef.current % workers.length];
        nextWorkerRef.current += 1;

        const timeoutId = window.setTimeout(() => {
          pendingRef.current.delete(id);
          const timeout = new Error(`"${file.name}" took too long to process and was skipped.`);
          timeout.name = 'TimeoutError';
          reject(timeout);
        }, COMPRESSION_TIMEOUT_MS);

        pendingRef.current.set(id, {
          resolve,
          reject,
          onProgress: options.onProgress,
          timeoutId,
        });

        worker.postMessage({
          type: 'compress',
          id,
          file,
          options: {
            quality: options.quality,
            maxWidth: options.maxWidth,
            format: resolveOutputFormat(options.format ?? 'jpeg'),
          },
        });
      }),
    []
  );

  const compress = useCallback(
    async (file: File, options: CompressionOptions): Promise<CompressionResult> => {
      if (supportedRef.current && workersRef.current.length > 0) {
        try {
          const encoded = await encodeInWorker(file, options);
          options.onProgress?.(100);
          return finalizeResult(file, encoded);
        } catch (error) {
          // Retrying a timeout would just make the user wait twice as long.
          if (error instanceof Error && error.name === 'TimeoutError') {
            throw error;
          }
          // A worker failure for one file (an image format the worker cannot
          // decode, for instance) should not fail the file outright.
          console.warn('Worker compression failed, retrying on the main thread:', error);
        }
      }

      return compressOnMainThread(file, options);
    },
    [encodeInWorker]
  );

  return { compress };
};
