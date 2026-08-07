import { describe, expect, it } from 'vitest';
import { isSameQueueEntry, updateQueueEntry } from './queue';
import type { QueuedImage } from '../types';

const makeImage = (id: string, name = `${id}.jpg`): QueuedImage => ({
  id,
  file: new File(['bytes'], name, { type: 'image/jpeg' }),
  status: 'idle',
});

describe('isSameQueueEntry', () => {
  it('matches on id and File together', () => {
    const image = makeImage('a');
    expect(isSameQueueEntry(image, image)).toBe(true);
    expect(isSameQueueEntry(image, { id: 'b', file: image.file })).toBe(false);
    expect(isSameQueueEntry(image, { id: 'a', file: new File([''], 'a.jpg') })).toBe(false);
  });
});

describe('updateQueueEntry', () => {
  it('patches the matching entry and leaves the others at the same identity', () => {
    const a = makeImage('a');
    const b = makeImage('b');

    const next = updateQueueEntry([a, b], a, { status: 'done', progress: 100 });

    expect(next[0]).toMatchObject({ id: 'a', status: 'done', progress: 100 });
    expect(next[0].file).toBe(a.file);
    // Untouched cards keep their object reference so memoized rows do not re-render.
    expect(next[1]).toBe(b);
  });

  it('drops the write-back when the entry was edited mid-batch', () => {
    const original = makeImage('a', 'photo.jpg');
    const editedFile = new File(['rotated'], 'photo.jpg', { type: 'image/jpeg' });
    // handleEditImage keeps the id and swaps the File — this is the entry the
    // still-in-flight job for the *original* File must not write onto.
    const edited: QueuedImage = { ...original, file: editedFile, status: 'idle' };

    const next = updateQueueEntry([edited], original, { status: 'done', progress: 100 });

    expect(next[0]).toBe(edited);
    expect(next[0].status).toBe('idle');
    expect(next[0].result).toBeUndefined();
  });

  it('drops the write-back when the entry was removed mid-batch', () => {
    const a = makeImage('a');
    const b = makeImage('b');

    expect(updateQueueEntry([b], a, { status: 'error', error: 'nope' })).toEqual([b]);
  });
});
