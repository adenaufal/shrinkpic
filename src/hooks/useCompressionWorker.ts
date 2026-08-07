import { useCallback, useEffect, useRef } from 'react';
import {
  CompressionOptions,
  CompressionResult,
  compressImage as compressOnMainThread,
  finalizeResult,
  resolveOutputFormat,
  COMPRESSION_TIMEOUT_MS,
} from '../utils/imageCompression';
import { getCompressionConcurrency } from '../utils/concurrency';
import { CompressionWorkerPool, isTimeoutError } from '../utils/workerPool';

/**
 * OffscreenCanvas + createImageBitmap are what make worker-side encoding
 * possible at all. Where they are missing (older Safari, some WebViews) we
 * transparently use the main-thread path instead.
 */
export const isWorkerPipelineSupported = (): boolean => {
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
 * pipeline is unavailable, dies, or fails on a single file.
 *
 * All of the pool's bookkeeping lives in `CompressionWorkerPool` — this hook is
 * only its lifecycle and the fallback policy.
 */
export const useCompressionWorker = () => {
  const poolRef = useRef<CompressionWorkerPool | null>(null);

  useEffect(() => {
    if (!isWorkerPipelineSupported()) {
      return;
    }

    const pool = new CompressionWorkerPool({
      size: getCompressionConcurrency(),
      timeoutMs: COMPRESSION_TIMEOUT_MS,
      spawn: () =>
        new Worker(new URL('../workers/compression.worker.ts', import.meta.url), {
          type: 'module',
        }),
    });

    poolRef.current = pool;

    return () => {
      poolRef.current = null;
      // Rejects everything still in flight, so no caller is left hanging.
      pool.destroy();
    };
  }, []);

  const compress = useCallback(
    async (file: File, options: CompressionOptions): Promise<CompressionResult> => {
      const pool = poolRef.current;

      if (pool?.available) {
        try {
          const encoded = await pool.run({
            file,
            options: {
              quality: options.quality,
              maxWidth: options.maxWidth,
              format: resolveOutputFormat(options.format ?? 'jpeg'),
            },
            onProgress: options.onProgress,
          });
          options.onProgress?.(100);
          return finalizeResult(file, encoded);
        } catch (error) {
          // Retrying a timeout on a healthy pool would just make the user wait
          // twice as long. If the timeout killed the last worker, though, the
          // main thread is now the only encoder left — so try it.
          if (isTimeoutError(error) && pool.available) {
            throw error;
          }
          // A worker failure for one file (an image format the worker cannot
          // decode, a crashed or restarted worker) should not fail the file.
          console.warn('Worker compression failed, retrying on the main thread:', error);
        }
      }

      return compressOnMainThread(file, options);
    },
    []
  );

  return { compress };
};
