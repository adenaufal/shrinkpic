import { MIME_BY_FORMAT, type OutputFormat } from './imageCompression';

/** Lower-case and collapse the non-standard `image/jpg` alias, so two MIME
 *  types for the same format always compare equal. */
const canonicalMime = (mimeType: string): string => {
  const normalized = mimeType.trim().toLowerCase();
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
};

/**
 * How many files in a run were saved in a format other than the one requested
 * — i.e. the re-encode was not smaller, so the original bytes were kept.
 *
 * Compares MIME types, never display labels: labels are for people and differ
 * in casing ("WebP" vs "WEBP"), which made every WebP run report every file as
 * kept. Files without an `outputType` (failed files) are not counted.
 */
export const countKeptOriginalFormat = (
  images: ReadonlyArray<{ outputType?: string }>,
  requestedFormat: OutputFormat
): number => {
  const requestedMime = MIME_BY_FORMAT[requestedFormat];
  return images.filter(
    (img) => img.outputType && canonicalMime(img.outputType) !== requestedMime
  ).length;
};
