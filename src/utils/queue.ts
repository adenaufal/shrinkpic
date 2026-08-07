import type { QueuedImage } from '../types';

/** The identity a compression job was started from: an id *and* a File. */
export type QueueEntryRef = Pick<QueuedImage, 'id' | 'file'>;

/**
 * True when the queue entry is still the exact one a job was started from.
 *
 * Ids survive an edit (the card keeps its place in the grid) while the File is
 * replaced, so an id-only match would let a job that started before the edit
 * write its stale result — wrong bytes, wrong size, wrong ratio — onto the
 * edited image.
 */
export const isSameQueueEntry = (image: QueueEntryRef, target: QueueEntryRef): boolean =>
  image.id === target.id && image.file === target.file;

/**
 * Applies `patch` to the entry that still matches `target`, leaving every other
 * entry at its previous object identity so memoized cards do not re-render.
 * A superseded job (its File was edited away) silently updates nothing.
 */
export const updateQueueEntry = (
  images: QueuedImage[],
  target: QueueEntryRef,
  patch: Partial<QueuedImage>
): QueuedImage[] =>
  images.map((image) => (isSameQueueEntry(image, target) ? { ...image, ...patch } : image));
