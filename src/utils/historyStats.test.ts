import { describe, expect, it } from 'vitest';
import { countKeptOriginalFormat } from './historyStats';

const outputs = (...types: (string | undefined)[]) =>
  types.map((outputType) => ({ outputType }));

describe('countKeptOriginalFormat', () => {
  it('counts nothing when every file of a WebP run was converted to WebP', () => {
    // Regression: the display label for image/webp is "WebP" while the
    // requested label was "WEBP", so every converted file used to be
    // reported as "kept original".
    const images = outputs('image/webp', 'image/webp', 'image/webp', 'image/webp');
    expect(countKeptOriginalFormat(images, 'webp')).toBe(0);
  });

  it('counts only the WebP-run files whose original format was kept', () => {
    const images = outputs('image/webp', 'image/png', 'image/webp', 'image/jpeg');
    expect(countKeptOriginalFormat(images, 'webp')).toBe(2);
  });

  it('treats image/jpg as the same format as a requested JPEG', () => {
    expect(countKeptOriginalFormat(outputs('image/jpeg', 'image/jpg'), 'jpeg')).toBe(0);
    expect(countKeptOriginalFormat(outputs('image/jpeg', 'image/png'), 'jpeg')).toBe(1);
  });

  it('counts JPEG files kept in a PNG run', () => {
    expect(countKeptOriginalFormat(outputs('image/png', 'image/png'), 'png')).toBe(0);
    expect(countKeptOriginalFormat(outputs('image/png', 'image/jpeg', 'image/webp'), 'png')).toBe(2);
  });

  it('compares MIME types case-insensitively', () => {
    expect(countKeptOriginalFormat(outputs('IMAGE/WEBP', 'Image/WebP'), 'webp')).toBe(0);
  });

  it('ignores files with no recorded output type, such as failed files', () => {
    expect(countKeptOriginalFormat(outputs(undefined, 'image/webp', ''), 'webp')).toBe(0);
  });
});
