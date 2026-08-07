import { formatFileSize } from './format';

export const MAX_FILES = 50;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Types the canvas pipeline can actually decode in mainstream browsers. */
export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/bmp',
];

export const ACCEPT_ATTRIBUTE = ACCEPTED_MIME_TYPES.join(',');

const HEIC_PATTERN = /\.(heic|heif)$/i;

export interface ValidationOutcome {
  accepted: File[];
  /** One human-readable line per reason, ready to show in a toast. */
  errors: string[];
}

/**
 * Shared by the picker and the drop target so both entry paths behave
 * identically, and so nothing is ever dropped silently.
 */
export const validateFiles = (incoming: File[], existingCount = 0): ValidationOutcome => {
  const accepted: File[] = [];
  const errors: string[] = [];

  const rejectedTypes: string[] = [];
  const heic: string[] = [];
  const tooLarge: string[] = [];
  let overflow = 0;

  incoming.forEach((file) => {
    if (HEIC_PATTERN.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif') {
      heic.push(file.name);
      return;
    }

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      rejectedTypes.push(file.name);
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      tooLarge.push(file.name);
      return;
    }

    if (existingCount + accepted.length >= MAX_FILES) {
      overflow += 1;
      return;
    }

    accepted.push(file);
  });

  if (heic.length > 0) {
    errors.push(
      `${heic.length} HEIC file${heic.length > 1 ? 's were' : ' was'} skipped — browsers cannot decode HEIC. Export as JPEG first.`
    );
  }
  if (rejectedTypes.length > 0) {
    errors.push(
      `${rejectedTypes.length} file${rejectedTypes.length > 1 ? 's were' : ' was'} skipped — only JPG, PNG, WebP, GIF, AVIF and BMP are supported.`
    );
  }
  if (tooLarge.length > 0) {
    errors.push(
      `${tooLarge.length} file${tooLarge.length > 1 ? 's were' : ' was'} skipped — the limit is ${formatFileSize(MAX_FILE_BYTES)} per image.`
    );
  }
  if (overflow > 0) {
    errors.push(`${overflow} file${overflow > 1 ? 's were' : ' was'} skipped — the queue holds ${MAX_FILES} images.`);
  }

  return { accepted, errors };
};
