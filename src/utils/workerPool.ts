import { createId } from './format';
import type { EncodedImage, OutputFormat } from './imageCompression';

/**
 * The slice of the `Worker` API this pool actually uses. Narrowing it here is
 * what makes the pool testable: the unit tests hand it a fake worker instead of
 * spinning up a real module worker (which Vitest/jsdom cannot load anyway).
 */
export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export interface CompressionJob {
  file: File;
  options: {
    quality: number;
    maxWidth?: number;
    format: OutputFormat;
  };
  onProgress?: (progress: number) => void;
}

export interface CompressionWorkerPoolOptions {
  /** Number of workers to start. */
  size: number;
  /** Constructs one worker. May throw; a throw simply shrinks the pool. */
  spawn: () => WorkerLike;
  /** Per-job budget before the worker is considered wedged. */
  timeoutMs: number;
  /** Overridable for deterministic tests. */
  newId?: () => string;
}

export const WORKER_UNAVAILABLE_MESSAGE = 'Worker pipeline unavailable.';
export const WORKER_CRASHED_MESSAGE = 'The compression worker crashed.';
export const WORKER_RESTARTED_MESSAGE = 'The compression worker was restarted.';
export const POOL_DESTROYED_MESSAGE = 'Compression was cancelled.';

/**
 * Timeouts are tagged so callers can tell "this file is too heavy for the
 * worker" (retrying on the main thread just doubles the wait) apart from "the
 * worker itself is broken" (retrying is exactly the right move).
 */
export const createTimeoutError = (fileName: string): Error => {
  const error = new Error(`"${fileName}" took too long to process and was skipped.`);
  error.name = 'TimeoutError';
  return error;
};

export const isTimeoutError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'TimeoutError';

interface PendingJob {
  worker: WorkerLike;
  resolve: (encoded: EncodedImage) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

interface WorkerMessage {
  type?: string;
  id?: string;
  progress?: number;
  encoded?: EncodedImage;
  error?: string;
}

/**
 * A small round-robin pool of encoding workers.
 *
 * Two failure modes drove its shape, because a `Worker` gives you no way to ask
 * "are you alive?" or "are you busy?":
 *
 *  - a module worker that fails to load (404 after a deploy, parse error, a
 *    browser that accepts `{ type: 'module' }` without supporting it) does not
 *    throw from the constructor. It reports asynchronously through `onerror`,
 *    so the pool has to treat that event as "this worker is dead" and go
 *    unavailable once the last one dies — otherwise every file silently waits
 *    out its full timeout instead of falling back to the main thread;
 *  - a worker that wedges on one pathological image keeps its message queue,
 *    and a blind round robin keeps feeding it. Dropping and replacing the
 *    worker on timeout is what stops a single bad file from failing every
 *    P-th image of the batch.
 *
 * Everything the pool rejects with is either a `TimeoutError` (do not retry) or
 * a plain `Error` (safe to retry on the main thread), and no job is ever left
 * unsettled — including on `destroy()`.
 */
export class CompressionWorkerPool {
  private readonly spawn: () => WorkerLike;
  private readonly timeoutMs: number;
  private readonly newId: () => string;
  private readonly workers: WorkerLike[] = [];
  private readonly jobs = new Map<string, PendingJob>();
  private cursor = 0;
  private destroyed = false;

  constructor({ size, spawn, timeoutMs, newId = createId }: CompressionWorkerPoolOptions) {
    this.spawn = spawn;
    this.timeoutMs = timeoutMs;
    this.newId = newId;

    for (let i = 0; i < Math.max(1, size); i += 1) {
      const worker = this.createWorker();
      if (!worker) break;
      this.workers.push(worker);
    }
  }

  /** False once every worker has died — the caller must then use the main thread. */
  get available(): boolean {
    return !this.destroyed && this.workers.length > 0;
  }

  get size(): number {
    return this.workers.length;
  }

  /** Jobs still waiting on a worker. Exposed for tests and diagnostics. */
  get pending(): number {
    return this.jobs.size;
  }

  run(job: CompressionJob): Promise<EncodedImage> {
    return new Promise<EncodedImage>((resolve, reject) => {
      if (!this.available) {
        reject(new Error(WORKER_UNAVAILABLE_MESSAGE));
        return;
      }

      const worker = this.workers[this.cursor % this.workers.length];
      this.cursor += 1;

      const id = this.newId();
      const timeoutId = setTimeout(() => {
        this.jobs.delete(id);
        // The worker is still chewing on whatever wedged it, so it cannot be
        // trusted with the rest of the batch: tear it down (which rejects the
        // jobs queued behind it, retryably) and start a fresh one in its place.
        this.dropWorker(worker, WORKER_RESTARTED_MESSAGE, true);
        reject(createTimeoutError(job.file.name));
      }, this.timeoutMs);

      this.jobs.set(id, {
        worker,
        resolve,
        reject,
        onProgress: job.onProgress,
        timeoutId,
      });

      worker.postMessage({
        type: 'compress',
        id,
        file: job.file,
        options: job.options,
      });
    });
  }

  destroy(): void {
    this.destroyed = true;
    // Reject rather than merely clear: a dropped job would leave its caller's
    // promise unsettled forever, and with it whatever `Promise.all` (and
    // `isProcessing` flag) is waiting on the batch.
    this.jobs.forEach((_job, id) => {
      this.settle(id, (job) => job.reject(new Error(POOL_DESTROYED_MESSAGE)));
    });
    this.jobs.clear();
    this.workers.forEach((worker) => this.disposeWorker(worker));
    this.workers.length = 0;
  }

  private createWorker(): WorkerLike | null {
    try {
      const worker = this.spawn();
      worker.onmessage = (event: MessageEvent) => this.handleMessage(event);
      worker.onerror = () => {
        // Deliberately not replaced: a worker that cannot load would respawn
        // into the same failure forever. Once the pool empties, `available`
        // goes false and the caller falls back to the main thread.
        this.dropWorker(worker, WORKER_CRASHED_MESSAGE, false);
      };
      return worker;
    } catch (error) {
      console.warn('Could not start a compression worker:', error);
      return null;
    }
  }

  private handleMessage(event: MessageEvent): void {
    const data = (event.data ?? null) as WorkerMessage | null;
    const id = data?.id;
    if (!id || !this.jobs.has(id)) return;

    if (data?.type === 'progress') {
      this.jobs.get(id)?.onProgress?.(data.progress ?? 0);
      return;
    }

    if (data?.type === 'result') {
      const encoded = data.encoded;
      this.settle(id, (job) =>
        encoded
          ? job.resolve(encoded)
          : job.reject(new Error('The compression worker returned no image.'))
      );
      return;
    }

    if (data?.type === 'error') {
      this.settle(id, (job) =>
        job.reject(new Error(data.error || 'Compression failed in worker.'))
      );
    }
  }

  private settle(id: string, apply: (job: PendingJob) => void): void {
    const job = this.jobs.get(id);
    if (!job) return;
    clearTimeout(job.timeoutId);
    this.jobs.delete(id);
    apply(job);
  }

  /**
   * Removes one worker from rotation, fails only *its* jobs (jobs on healthy
   * workers are untouched) and optionally starts a replacement.
   */
  private dropWorker(worker: WorkerLike, message: string, replace: boolean): void {
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      this.workers.splice(index, 1);
    }
    this.disposeWorker(worker);

    this.jobs.forEach((job, id) => {
      if (job.worker !== worker) return;
      this.settle(id, (pending) => pending.reject(new Error(message)));
    });

    if (replace && !this.destroyed) {
      const replacement = this.createWorker();
      if (replacement) {
        this.workers.push(replacement);
      }
    }
  }

  private disposeWorker(worker: WorkerLike): void {
    worker.onmessage = null;
    worker.onerror = null;
    try {
      worker.terminate();
    } catch (error) {
      // A worker that never loaded can throw here; it is already gone.
      console.warn('Failed to terminate a compression worker:', error);
    }
  }
}
