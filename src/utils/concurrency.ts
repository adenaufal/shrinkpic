/**
 * Runs `task` over `items` with at most `limit` in flight at a time.
 *
 * Compression holds a decoded bitmap plus a canvas backing store per image, so
 * starting every file at once is a reliable way to crash the tab. Results come
 * back in input order and never reject — one bad image cannot take the batch
 * down with it.
 */
export const runWithConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> => {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  const size = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { status: 'fulfilled', value: await task(items[index], index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };

  await Promise.all(Array.from({ length: size }, worker));
  return results;
};

/** Small pool: enough to keep the encoder busy, not enough to exhaust memory. */
export const getCompressionConcurrency = (): number => {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  return Math.max(2, Math.min(4, cores - 1));
};
