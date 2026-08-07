import { describe, expect, it } from 'vitest';
import { computeTargetSize, finalizeResult, outputFilename, type EncodedImage } from './imageCompression';

describe('computeTargetSize', () => {
  it('never upscales an image smaller than the requested max dimension', () => {
    expect(computeTargetSize(400, 300, 1920)).toEqual({ width: 400, height: 300 });
  });

  it('scales the long edge down to the limit and preserves aspect ratio', () => {
    // 2560x1707 at a 2560 cap used to come out 1620x1080 because of a hidden
    // 1080px height cap — the fix constrains on the long edge only.
    expect(computeTargetSize(2560, 1707, 2560)).toEqual({ width: 2560, height: 1707 });
  });

  it('scales a portrait image down using its own long edge, not a fixed height cap', () => {
    const result = computeTargetSize(3000, 4000, 2560);
    expect(result.height).toBe(2560);
    expect(result.width).toBe(Math.round(3000 * (2560 / 4000)));
  });

  it('falls back to the source size when no max dimension is given', () => {
    expect(computeTargetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('always returns whole-pixel, at-least-1px dimensions', () => {
    const result = computeTargetSize(10000, 1, 33);
    expect(Number.isInteger(result.width)).toBe(true);
    expect(Number.isInteger(result.height)).toBe(true);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });
});

const encodedOf = (bytes: number): EncodedImage => ({
  blob: new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }),
  originalWidth: 100,
  originalHeight: 100,
  outputWidth: 100,
  outputHeight: 100,
});

describe('finalizeResult — keep original when the re-encode is not smaller', () => {
  it('keeps the original bytes and reports zero saving when the encode grew the file', () => {
    const file = new File([new Uint8Array(1000)], 'photo.png', { type: 'image/png' });
    const result = finalizeResult(file, encodedOf(1400));

    expect(result.alreadyOptimized).toBe(true);
    expect(result.blob).toBe(file);
    expect(result.compressedSize).toBe(file.size);
    expect(result.compressionRatio).toBe(0);
    URL.revokeObjectURL(result.url);
  });

  it('keeps the original when the encode is exactly the same size (no real saving)', () => {
    const file = new File([new Uint8Array(1000)], 'photo.jpg', { type: 'image/jpeg' });
    const result = finalizeResult(file, encodedOf(1000));

    expect(result.alreadyOptimized).toBe(true);
    expect(result.compressionRatio).toBe(0);
    URL.revokeObjectURL(result.url);
  });

  it('uses the smaller re-encoded blob and reports a positive, correct ratio', () => {
    const file = new File([new Uint8Array(1000)], 'photo.jpg', { type: 'image/jpeg' });
    const result = finalizeResult(file, encodedOf(250));

    expect(result.alreadyOptimized).toBe(false);
    expect(result.blob).not.toBe(file);
    expect(result.compressedSize).toBe(250);
    expect(result.compressionRatio).toBeCloseTo(75, 5);
    URL.revokeObjectURL(result.url);
  });
});

describe('outputFilename', () => {
  it('derives the extension from the actual blob mime type, never the requested one', () => {
    expect(outputFilename('photo.png', 'image/jpeg')).toBe('photo_compressed.jpg');
    expect(outputFilename('photo.HEIC', 'image/webp')).toBe('photo_compressed.webp');
  });

  it('falls back to a sane name when the original has no extension', () => {
    expect(outputFilename('IMG_2024', 'image/png')).toBe('IMG_2024_compressed.png');
  });
});
