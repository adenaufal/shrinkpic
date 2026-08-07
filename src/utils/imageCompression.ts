export type OutputFormat = 'jpeg' | 'png' | 'webp';

export interface CompressionOptions {
  quality: number;
  maxWidth?: number;
  format?: OutputFormat;
  onProgress?: (progress: number) => void;
}

export interface CompressionResult {
  blob: Blob;
  url: string;
  originalSize: number;
  compressedSize: number;
  /** Always >= 0. Zero means "no saving, original bytes kept". */
  compressionRatio: number;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  /** Actual MIME type of `blob` — never assumed from the requested format. */
  outputType: string;
  /** True when re-encoding produced a bigger file and the original was kept. */
  alreadyOptimized: boolean;
}

/** Raw encode output, before the "did this actually help?" decision. */
export interface EncodedImage {
  blob: Blob;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
}

export const MIME_BY_FORMAT: Record<OutputFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
};

/** Hard stop for a single image so one bad file can never hang the batch. */
export const COMPRESSION_TIMEOUT_MS = 60_000;

/** Formats without an alpha channel need an opaque matte before drawing. */
const OPAQUE_FORMATS = new Set(['image/jpeg', 'image/bmp']);

export const BACKGROUND_MATTE = '#FFFFFF';

/**
 * Scale so the long edge fits `maxWidth`, never upscaling. The old code also
 * applied a hidden 1080px height cap which silently ignored the user's choice.
 */
export const computeTargetSize = (
  width: number,
  height: number,
  maxWidth?: number
): { width: number; height: number } => {
  const longEdge = Math.max(width, height);
  const limit = maxWidth && maxWidth > 0 ? maxWidth : longEdge;
  const scale = Math.min(1, limit / longEdge);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const formatSupportCache = new Map<OutputFormat, boolean>();

/** Feature-detect encoder support — browsers silently fall back to PNG. */
export const isFormatSupported = (format: OutputFormat): boolean => {
  const cached = formatSupportCache.get(format);
  if (cached !== undefined) return cached;

  let supported = true;
  try {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const mime = MIME_BY_FORMAT[format];
    supported = probe.toDataURL(mime).startsWith(`data:${mime}`);
  } catch {
    supported = format === 'jpeg' || format === 'png';
  }

  formatSupportCache.set(format, supported);
  return supported;
};

/** Falls back to a format the browser can actually encode. */
export const resolveOutputFormat = (format: OutputFormat): OutputFormat =>
  isFormatSupported(format) ? format : 'jpeg';

/**
 * Output filename derived from the blob's real MIME type, so the extension can
 * never lie about the bytes. Used by both the single and the ZIP download path.
 */
export const outputFilename = (originalName: string, mimeType: string): string => {
  const base = originalName.replace(/\.[^/.]+$/, '') || 'image';
  const extension = EXTENSION_BY_MIME[mimeType] ?? 'jpg';
  return `${base}_compressed.${extension}`;
};

/**
 * Decide whether the re-encode was worth it. If the output is not smaller we
 * keep the original bytes and label the result honestly rather than reporting a
 * negative saving.
 */
export const finalizeResult = (file: File, encoded: EncodedImage): CompressionResult => {
  const grewOrTied = encoded.blob.size >= file.size;
  const blob: Blob = grewOrTied ? file : encoded.blob;
  const compressedSize = blob.size;
  const ratio = file.size > 0 ? ((file.size - compressedSize) / file.size) * 100 : 0;

  return {
    blob,
    url: URL.createObjectURL(blob),
    originalSize: file.size,
    compressedSize,
    compressionRatio: Math.max(0, ratio),
    originalWidth: encoded.originalWidth,
    originalHeight: encoded.originalHeight,
    outputWidth: grewOrTied ? encoded.originalWidth : encoded.outputWidth,
    outputHeight: grewOrTied ? encoded.originalHeight : encoded.outputHeight,
    outputType: grewOrTied ? file.type || encoded.blob.type : encoded.blob.type,
    alreadyOptimized: grewOrTied,
  };
};

export const revokeResultUrl = (result?: { url?: string }): void => {
  if (result?.url) {
    URL.revokeObjectURL(result.url);
  }
};

/**
 * Main-thread encode. Every failure path rejects — nothing can leave the
 * promise pending — and a watchdog rejects images that never decode.
 */
export const encodeOnMainThread = (
  file: File,
  options: CompressionOptions
): Promise<EncodedImage> => {
  return new Promise<EncodedImage>((resolve, reject) => {
    const img = new Image();
    const sourceUrl = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
      img.src = '';
      URL.revokeObjectURL(sourceUrl);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const succeed = (encoded: EncodedImage) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(encoded);
    };

    const timeoutId = window.setTimeout(() => {
      fail(new Error(`"${file.name}" took too long to process and was skipped.`));
    }, COMPRESSION_TIMEOUT_MS);

    options.onProgress?.(10);

    img.onerror = () => {
      fail(
        new Error(
          `Could not decode "${file.name}". The file may be corrupt or in a format this browser cannot read (HEIC is not supported).`
        )
      );
    };

    img.onload = () => {
      try {
        options.onProgress?.(30);

        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;
        if (!originalWidth || !originalHeight) {
          fail(new Error(`"${file.name}" has no readable image data.`));
          return;
        }

        const { width, height } = computeTargetSize(originalWidth, originalHeight, options.maxWidth);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          fail(new Error('Canvas 2D context unavailable — the image is too large for this device.'));
          return;
        }

        options.onProgress?.(50);

        const targetFormat = resolveOutputFormat(options.format ?? 'jpeg');
        const mimeType = MIME_BY_FORMAT[targetFormat];

        // Formats without alpha composite onto black unless we lay a matte down
        // first, which is what turns transparent PNGs into black rectangles.
        if (OPAQUE_FORMATS.has(mimeType)) {
          ctx.fillStyle = BACKGROUND_MATTE;
          ctx.fillRect(0, 0, width, height);
        }

        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        options.onProgress?.(70);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              fail(
                new Error(
                  `Could not encode "${file.name}". Try a smaller image or a different output format.`
                )
              );
              return;
            }
            options.onProgress?.(90);
            succeed({
              blob,
              originalWidth,
              originalHeight,
              outputWidth: width,
              outputHeight: height,
            });
          },
          mimeType,
          // PNG is lossless — passing a quality argument is meaningless and
          // misleading, so it is deliberately omitted.
          mimeType === 'image/png' ? undefined : options.quality
        );
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
      }
    };

    img.src = sourceUrl;
  });
};

/** Full main-thread compression, used directly as the no-worker fallback. */
export const compressImage = async (
  file: File,
  options: CompressionOptions
): Promise<CompressionResult> => {
  const encoded = await encodeOnMainThread(file, options);
  options.onProgress?.(100);
  return finalizeResult(file, encoded);
};

export const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking on the same tick can cancel the download before the browser has
  // read the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

export const isClipboardSupported = (): boolean =>
  typeof navigator !== 'undefined' &&
  !!navigator.clipboard?.write &&
  typeof ClipboardItem !== 'undefined';

/** Re-encode to PNG, the only image type every clipboard implementation takes. */
const toPngBlob = (blob: Blob): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the image for the clipboard.'));
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable.');
        ctx.fillStyle = BACKGROUND_MATTE;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((png) => {
          URL.revokeObjectURL(url);
          if (!png) {
            reject(new Error('Could not convert the image for the clipboard.'));
            return;
          }
          resolve(png);
        }, 'image/png');
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };

    img.src = url;
  });

/**
 * Copies a single image. The system clipboard holds one item, so copying a
 * whole batch is not a thing that exists — see `App.handleCopyFirst`.
 * Returns the MIME type that actually landed on the clipboard.
 */
export const copyImageToClipboard = async (blob: Blob): Promise<string> => {
  if (!isClipboardSupported()) {
    throw new Error('This browser cannot copy images to the clipboard.');
  }

  const supportsType = (ClipboardItem as unknown as { supports?: (type: string) => boolean }).supports;
  const canUseNativeType =
    blob.type === 'image/png' || (typeof supportsType === 'function' && supportsType(blob.type));

  const payload = canUseNativeType ? blob : await toPngBlob(blob);
  await navigator.clipboard.write([new ClipboardItem({ [payload.type]: payload })]);
  return payload.type;
};
