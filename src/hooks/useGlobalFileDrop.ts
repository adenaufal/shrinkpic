import { useCallback, useEffect, useState } from 'react';
import { hasOpenDialog } from './useKeyboardShortcuts';

const carriesFiles = (event: DragEvent) =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files');

/**
 * Turns the whole window into a drop target. Returns whether files are being
 * dragged over the page; the caller shows a full-screen overlay that takes
 * the drop.
 *
 * `dragenter` is observed in the capture phase so no element's own handler
 * can hide the drag from us. Every file `dragover` has its default cancelled:
 * without that, a drop that misses the overlay makes the browser navigate to
 * the image and throw the whole queue away.
 */
export function useGlobalFileDrop() {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onDragEnter = (event: DragEvent) => {
      // Dropping into an open editor or comparison is not supported — the
      // overlay would pop up over the dialog.
      if (!carriesFiles(event) || hasOpenDialog()) return;
      setDragging(true);
    };

    const onDragOver = (event: DragEvent) => {
      if (carriesFiles(event)) event.preventDefault();
    };

    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      setDragging(false);
    };

    // Mouse events are suppressed for the whole of a drag, so the first one
    // after it means the drag ended somewhere we were not told about (a
    // cancelled drag in some browsers never sends `dragleave`).
    const onMouseMove = () => setDragging(false);

    window.addEventListener('dragenter', onDragEnter, true);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    window.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('dragenter', onDragEnter, true);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  const endDrag = useCallback(() => setDragging(false), []);

  return { dragging, endDrag };
}
