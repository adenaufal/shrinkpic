import type { CompressionResult } from './utils/imageCompression';

export type QueueStatus = 'idle' | 'processing' | 'done' | 'error';

/**
 * One image in the queue. `id` is assigned at intake and never changes, so
 * every state update, React key and result write-back can be keyed by it
 * instead of by array position.
 */
export interface QueuedImage {
  id: string;
  file: File;
  status: QueueStatus;
  progress?: number;
  result?: CompressionResult;
  error?: string;
}
