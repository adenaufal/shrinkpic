import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CompressionWorkerPool,
  POOL_DESTROYED_MESSAGE,
  WORKER_CRASHED_MESSAGE,
  WORKER_RESTARTED_MESSAGE,
  WORKER_UNAVAILABLE_MESSAGE,
  type WorkerLike,
} from './workerPool';
import type { EncodedImage } from './imageCompression';

const TIMEOUT_MS = 1000;

/**
 * Stands in for a real module worker: records what was posted and lets a test
 * drive the responses (or refuse to answer at all, which is exactly what a
 * wedged worker does).
 */
class FakeWorker implements WorkerLike {
  static instances: FakeWorker[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: { type: string; id: string; file: File }[] = [];
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message: unknown): void {
    this.posted.push(message as { type: string; id: string; file: File });
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Last job id this worker was handed. */
  get lastId(): string {
    return this.posted[this.posted.length - 1].id;
  }

  emit(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  succeed(id = this.lastId, encoded: Partial<EncodedImage> = {}): void {
    this.emit({
      type: 'result',
      id,
      encoded: {
        blob: new Blob(['x']),
        originalWidth: 10,
        originalHeight: 10,
        outputWidth: 10,
        outputHeight: 10,
        ...encoded,
      },
    });
  }

  fail(id = this.lastId, error = 'boom'): void {
    this.emit({ type: 'error', id, error });
  }

  crash(): void {
    this.onerror?.(new ErrorEvent('error', { message: 'Failed to load worker' }));
  }
}

const makePool = (size: number, spawn: () => WorkerLike = () => new FakeWorker()) =>
  new CompressionWorkerPool({ size, spawn, timeoutMs: TIMEOUT_MS });

const job = (name: string) => ({
  file: new File(['bytes'], name, { type: 'image/jpeg' }),
  options: { quality: 0.8, format: 'jpeg' as const },
});

beforeEach(() => {
  FakeWorker.instances = [];
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CompressionWorkerPool dispatch', () => {
  it('resolves a job from the worker it was dispatched to', async () => {
    const pool = makePool(2);
    const promise = pool.run(job('a.jpg'));

    FakeWorker.instances[0].succeed();

    await expect(promise).resolves.toMatchObject({ outputWidth: 10 });
    expect(pool.pending).toBe(0);
  });

  it('spreads jobs round robin and forwards progress to the right job only', async () => {
    const pool = makePool(2);
    const progressA: number[] = [];
    const progressB: number[] = [];

    const a = pool.run({ ...job('a.jpg'), onProgress: (p) => progressA.push(p) });
    const b = pool.run({ ...job('b.jpg'), onProgress: (p) => progressB.push(p) });

    expect(FakeWorker.instances[0].posted).toHaveLength(1);
    expect(FakeWorker.instances[1].posted).toHaveLength(1);

    FakeWorker.instances[0].emit({ type: 'progress', id: FakeWorker.instances[0].lastId, progress: 30 });
    expect(progressA).toEqual([30]);
    expect(progressB).toEqual([]);

    FakeWorker.instances[0].succeed();
    FakeWorker.instances[1].succeed();
    await Promise.all([a, b]);
  });

  it('rejects a per-file worker error without taking the pool down', async () => {
    const pool = makePool(1);
    const promise = pool.run(job('a.jpg'));

    FakeWorker.instances[0].fail(undefined, 'Unsupported image');

    await expect(promise).rejects.toThrow('Unsupported image');
    expect(pool.available).toBe(true);
  });
});

describe('CompressionWorkerPool worker failure', () => {
  it('marks the pipeline unavailable when the last worker fails to load', async () => {
    const pool = makePool(1);
    const promise = pool.run(job('a.jpg'));

    // A module worker that 404s reports asynchronously; nothing else tells the
    // pool it is dead, and the old code let the job sit until it timed out.
    FakeWorker.instances[0].crash();

    await expect(promise).rejects.toThrow(WORKER_CRASHED_MESSAGE);
    // Not a TimeoutError: the caller must retry this file on the main thread.
    await expect(promise).rejects.toSatisfy((error: Error) => error.name !== 'TimeoutError');
    expect(pool.available).toBe(false);
    expect(FakeWorker.instances[0].terminated).toBe(true);

    await expect(pool.run(job('b.jpg'))).rejects.toThrow(WORKER_UNAVAILABLE_MESSAGE);
    // No respawn loop: a worker that cannot load never will.
    expect(FakeWorker.instances).toHaveLength(1);
  });

  it('does not fail jobs that belong to healthy workers', async () => {
    const pool = makePool(2);
    const a = pool.run(job('a.jpg'));
    const b = pool.run(job('b.jpg'));

    FakeWorker.instances[0].crash();

    await expect(a).rejects.toThrow(WORKER_CRASHED_MESSAGE);
    expect(pool.available).toBe(true);
    expect(pool.size).toBe(1);

    FakeWorker.instances[1].succeed();
    await expect(b).resolves.toMatchObject({ outputHeight: 10 });
  });
});

describe('CompressionWorkerPool timeouts', () => {
  it('tags the timeout, then terminates and replaces the wedged worker', async () => {
    const pool = makePool(1);
    const promise = pool.run(job('huge.png'));
    const wedged = FakeWorker.instances[0];

    vi.advanceTimersByTime(TIMEOUT_MS);

    await expect(promise).rejects.toMatchObject({
      name: 'TimeoutError',
      message: expect.stringContaining('huge.png'),
    });
    expect(wedged.terminated).toBe(true);
    // Replaced, not just dropped: the pool keeps its width for the rest of the batch.
    expect(FakeWorker.instances).toHaveLength(2);
    expect(pool.size).toBe(1);
    expect(pool.available).toBe(true);

    const next = pool.run(job('b.jpg'));
    expect(FakeWorker.instances[1].posted).toHaveLength(1);
    FakeWorker.instances[1].succeed();
    await expect(next).resolves.toBeTruthy();
  });

  it('fails jobs queued behind the wedged worker immediately and retryably', async () => {
    const pool = makePool(1);
    const first = pool.run(job('huge.png'));
    const queued = pool.run(job('next.jpg'));

    vi.advanceTimersByTime(TIMEOUT_MS);

    await expect(first).rejects.toMatchObject({ name: 'TimeoutError' });
    // The old pool left this one to burn its own full timeout on a dead worker
    // and then refused to retry it, because it also came back as a TimeoutError.
    await expect(queued).rejects.toThrow(WORKER_RESTARTED_MESSAGE);
    await expect(queued).rejects.toSatisfy((error: Error) => error.name !== 'TimeoutError');
  });

  it('goes unavailable when a replacement worker cannot be spawned', async () => {
    let spawns = 0;
    const pool = makePool(1, () => {
      spawns += 1;
      if (spawns > 1) throw new Error('no more workers');
      return new FakeWorker();
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const promise = pool.run(job('huge.png'));
    vi.advanceTimersByTime(TIMEOUT_MS);

    await expect(promise).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(pool.available).toBe(false);
  });
});

describe('CompressionWorkerPool teardown', () => {
  it('rejects in-flight jobs instead of stranding their promises', async () => {
    const pool = makePool(2);
    const a = pool.run(job('a.jpg'));
    const b = pool.run(job('b.jpg'));

    pool.destroy();

    await expect(a).rejects.toThrow(POOL_DESTROYED_MESSAGE);
    await expect(b).rejects.toThrow(POOL_DESTROYED_MESSAGE);
    expect(pool.pending).toBe(0);
    expect(pool.available).toBe(false);
    expect(FakeWorker.instances.every((worker) => worker.terminated)).toBe(true);
  });

  it('ignores late messages and never respawns after destroy', async () => {
    const pool = makePool(1);
    const promise = pool.run(job('a.jpg'));
    const worker = FakeWorker.instances[0];
    const id = worker.lastId;

    pool.destroy();
    await expect(promise).rejects.toThrow(POOL_DESTROYED_MESSAGE);

    // Nothing is listening any more; this must not throw or resurrect the pool.
    worker.emit({ type: 'result', id, encoded: null });
    vi.advanceTimersByTime(TIMEOUT_MS * 2);
    expect(FakeWorker.instances).toHaveLength(1);
    expect(pool.available).toBe(false);
  });
});
