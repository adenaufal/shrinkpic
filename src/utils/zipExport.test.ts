import { describe, expect, it } from 'vitest';
import { dedupeFilenames } from './zipExport';

describe('dedupeFilenames', () => {
  it('leaves already-unique names untouched', () => {
    expect(dedupeFilenames(['a.jpg', 'b.jpg', 'c.png'])).toEqual([
      'a.jpg',
      'b.jpg',
      'c.png',
    ]);
  });

  it('suffixes a repeated name so JSZip cannot silently overwrite it', () => {
    expect(dedupeFilenames(['IMG_0001.jpg', 'IMG_0001.jpg'])).toEqual([
      'IMG_0001.jpg',
      'IMG_0001 (2).jpg',
    ]);
  });

  it('keeps incrementing through triple (and further) duplicates', () => {
    expect(dedupeFilenames(['photo.png', 'photo.png', 'photo.png'])).toEqual([
      'photo.png',
      'photo (2).png',
      'photo (3).png',
    ]);
  });

  it('does not collide a generated suffix with a name that was already taken', () => {
    // If "photo (2).png" is already in the batch, the dedupe for the second
    // "photo.png" must skip past it to "photo (3).png".
    expect(dedupeFilenames(['photo.png', 'photo (2).png', 'photo.png'])).toEqual([
      'photo.png',
      'photo (2).png',
      'photo (3).png',
    ]);
  });

  it('handles names with no extension', () => {
    expect(dedupeFilenames(['README', 'README'])).toEqual(['README', 'README (2)']);
  });
});
