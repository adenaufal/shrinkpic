import React from 'react';
import { DropArt, MarchingBorder } from './art/DropArt';
import { MAX_FILES } from '../utils/fileValidation';

interface DropOverlayProps {
  open: boolean;
  /** A batch is running — the drop is refused with an explanation. */
  busy: boolean;
  onDropFiles: (files: File[]) => void;
  onClose: () => void;
}

/**
 * Full-window drop target shown while files are dragged over the page, so a
 * drop works anywhere — not only on the landing drop zone. Its children
 * ignore the pointer, which keeps the overlay the only hit target: a
 * `dragleave` then only ever means the drag left the window.
 */
export const DropOverlay: React.FC<DropOverlayProps> = ({ open, busy, onDropFiles, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="drop-zone fixed inset-0 z-[70] flex animate-in items-center justify-center bg-gray-50/80 p-4 backdrop-blur-sm fade-in-0 dark:bg-dark-bg/80"
      data-drag={busy ? 'false' : 'true'}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = busy ? 'none' : 'copy';
      }}
      onDragLeave={(event) => {
        const next = event.relatedTarget as Node | null;
        if (!next || !event.currentTarget.contains(next)) onClose();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onClose();
        if (busy) return;
        const files = Array.from(event.dataTransfer.files);
        if (files.length > 0) onDropFiles(files);
      }}
    >
      <div className="pointer-events-none relative flex w-full max-w-lg animate-in flex-col items-center overflow-hidden rounded-3xl bg-white/90 px-6 py-12 text-center shadow-2xl shadow-brand-600/10 zoom-in-95 fade-in-0 duration-200 dark:bg-dark-card/90">
        <MarchingBorder radius={24} active={!busy} />
        <DropArt className="h-28 w-36" />
        <p className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-50">
          {busy ? 'One batch at a time' : 'Drop to add these images'}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {busy
            ? 'Wait for the current batch to finish, then drop again.'
            : `Up to ${MAX_FILES} images — they stay on this device.`}
        </p>
      </div>
    </div>
  );
};
