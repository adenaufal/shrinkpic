/// <reference lib="webworker" />
// Image compression off the main thread.
//
// Everything here is worker-safe: `createImageBitmap` replaces `new Image()`
// (there is no DOM in a worker) and `OffscreenCanvas.convertToBlob` replaces
// `canvas.toBlob`. Object URLs are deliberately NOT created here — a URL minted
// in a worker is scoped to the worker — the raw Blob is posted back instead.

type OutputFormat = 'jpeg' | 'png' | 'webp';

interface CompressRequest {
  type: 'compress';
  id: string;
  file: File;
  options: {
    quality: number;
    maxWidth?: number;
    format?: OutputFormat;
  };
}

const MIME_BY_FORMAT: Record<OutputFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const OPAQUE_FORMATS = new Set(['image/jpeg', 'image/bmp']);
const BACKGROUND_MATTE = '#FFFFFF';

const computeTargetSize = (width: number, height: number, maxWidth?: number) => {
  const longEdge = Math.max(width, height);
  const limit = maxWidth && maxWidth > 0 ? maxWidth : longEdge;
  const scale = Math.min(1, limit / longEdge);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const postProgress = (id: string, progress: number) => {
  self.postMessage({ type: 'progress', id, progress });
};

const compress = async (request: CompressRequest): Promise<void> => {
  const { id, file, options } = request;
  let bitmap: ImageBitmap | null = null;

  try {
    postProgress(id, 10);

    bitmap = await createImageBitmap(file);
    postProgress(id, 30);

    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;
    const { width, height } = computeTargetSize(originalWidth, originalHeight, options.maxWidth);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable in worker.');
    }

    postProgress(id, 50);

    const format: OutputFormat = options.format ?? 'jpeg';
    const mimeType = MIME_BY_FORMAT[format] ?? MIME_BY_FORMAT.jpeg;

    if (OPAQUE_FORMATS.has(mimeType)) {
      ctx.fillStyle = BACKGROUND_MATTE;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    bitmap = null;

    postProgress(id, 70);

    const blob = await canvas.convertToBlob(
      mimeType === 'image/png' ? { type: mimeType } : { type: mimeType, quality: options.quality }
    );

    postProgress(id, 90);

    self.postMessage({
      type: 'result',
      id,
      encoded: {
        blob,
        originalWidth,
        originalHeight,
        outputWidth: width,
        outputHeight: height,
      },
    });
  } catch (error) {
    bitmap?.close();
    self.postMessage({
      type: 'error',
      id,
      error:
        error instanceof Error
          ? error.message
          : `Could not process "${file?.name ?? 'image'}" in this browser.`,
    });
  }
};

self.onmessage = (event: MessageEvent<CompressRequest>) => {
  if (event.data?.type === 'compress') {
    void compress(event.data);
  }
};

export {};
