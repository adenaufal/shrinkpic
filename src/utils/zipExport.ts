import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ImageToZip {
  blob: Blob;
  filename: string;
}

/**
 * JSZip keys entries by path, so two inputs called `IMG_0001.jpg` used to
 * silently overwrite each other while the UI still reported the full count.
 */
export const dedupeFilenames = (filenames: string[]): string[] => {
  const used = new Set<string>();

  return filenames.map((filename) => {
    if (!used.has(filename)) {
      used.add(filename);
      return filename;
    }

    const dot = filename.lastIndexOf('.');
    const base = dot > 0 ? filename.slice(0, dot) : filename;
    const extension = dot > 0 ? filename.slice(dot) : '';

    let counter = 2;
    let candidate = `${base} (${counter})${extension}`;
    while (used.has(candidate)) {
      counter += 1;
      candidate = `${base} (${counter})${extension}`;
    }

    used.add(candidate);
    return candidate;
  });
};

/**
 * Export multiple images as a ZIP file.
 */
export const exportToZip = async (
  images: ImageToZip[],
  zipFilename: string = 'compressed-images.zip'
): Promise<void> => {
  if (images.length === 0) {
    throw new Error('No images to export');
  }

  const zip = new JSZip();
  const names = dedupeFilenames(
    images.map((image, index) => image.filename || `image-${index + 1}.jpg`)
  );

  images.forEach((image, index) => {
    zip.file(names[index], image.blob);
  });

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6,
    },
  });

  saveAs(content, zipFilename);
};
