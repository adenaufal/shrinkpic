const SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

/**
 * Human readable byte size. Single source of truth for the whole app.
 */
export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Bytes';

  const k = 1024;
  const rawIndex = Math.floor(Math.log(bytes) / Math.log(k));
  const i = Math.min(Math.max(rawIndex, 0), SIZE_UNITS.length - 1);

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${SIZE_UNITS[i]}`;
};

/**
 * Stable unique id for queued images. `crypto.randomUUID` is available in every
 * browser we target, but older WebViews still need the fallback.
 */
export const createId = (): string => {
  const cryptoRef = globalThis.crypto as Crypto | undefined;
  if (cryptoRef?.randomUUID) {
    return cryptoRef.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
