import { useEffect, useRef } from 'react';
import { hasOpenDialog, isTypingTarget } from './useKeyboardShortcuts';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
};

/** Screenshots arrive from the clipboard as a bare "image.png". */
const GENERIC_NAME = /^image\.\w+$/i;

const stamp = (date: Date) =>
  [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join('');

/**
 * Adds images pasted anywhere on the page (Ctrl/⌘+V) — the fastest path for
 * screenshots. Pastes into text fields and into open dialogs are left alone.
 */
export function usePasteImages(onFiles: (files: File[]) => void) {
  const onFilesRef = useRef(onFiles);
  useEffect(() => {
    onFilesRef.current = onFiles;
  });

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target) || hasOpenDialog()) return;

      const images = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith('image/')
      );
      if (images.length === 0) return;
      event.preventDefault();

      const time = stamp(new Date());
      const named = images.map((file, index) => {
        if (!GENERIC_NAME.test(file.name)) return file;
        const extension = EXTENSION_BY_MIME[file.type] ?? 'png';
        const suffix = images.length > 1 ? `-${index + 1}` : '';
        return new File([file], `pasted-${time}${suffix}.${extension}`, {
          type: file.type,
          lastModified: Date.now(),
        });
      });

      onFilesRef.current(named);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);
}
