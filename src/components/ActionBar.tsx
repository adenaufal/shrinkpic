import React from 'react';
import { Archive, Download, Trash2, Zap } from 'lucide-react';

interface ActionBarProps {
  onCompress: () => void;
  onDownloadAll: () => void;
  onDownloadAsZip: () => void;
  onClearAll: () => void;
  isProcessing: boolean;
  imageCount: number;
  hasResults: boolean;
}

/**
 * Every action that applies to the whole queue, in one place: the primary
 * Compress button plus Download all / ZIP / Clear.
 *
 * A single element that is a fixed bottom bar below `md` and an ordinary card
 * in the page flow above it — one mount, two layouts, so the buttons can never
 * drift apart between breakpoints. `App` reserves the bar's height with bottom
 * padding on small screens.
 */
export const ActionBar: React.FC<ActionBarProps> = ({
  onCompress,
  onDownloadAll,
  onDownloadAsZip,
  onClearAll,
  isProcessing,
  imageCount,
  hasResults,
}) => {
  const compressLabel = isProcessing
    ? 'Compressing…'
    : hasResults
    ? 'Compress again'
    : `Compress ${imageCount} image${imageCount === 1 ? '' : 's'}`;

  return (
    <div
      role="group"
      aria-label="Actions for all images"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur dark:border-dark-border dark:bg-dark-bg/95 md:static md:rounded-2xl md:border md:bg-white md:p-4 md:backdrop-blur-none md:dark:bg-dark-card"
    >
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2">
        <button
          type="button"
          onClick={onCompress}
          disabled={isProcessing}
          className={`btn ${hasResults ? 'btn-secondary btn-icon sm:w-auto sm:flex-1 sm:px-4' : 'btn-primary flex-1'}`}
          aria-label={compressLabel}
          title={`${compressLabel} — Ctrl+Enter`}
        >
          <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className={hasResults ? 'hidden truncate sm:inline' : 'truncate'}>
            {compressLabel}
          </span>
        </button>

        {hasResults && (
          <>
            <button
              type="button"
              onClick={onDownloadAll}
              className="btn btn-primary min-w-0 flex-1"
              title="Download every compressed image — Ctrl+Shift+D"
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Download all</span>
            </button>
            <button
              type="button"
              onClick={onDownloadAsZip}
              className="btn btn-secondary btn-icon sm:w-auto sm:px-3"
              aria-label="Download all compressed images as a ZIP file"
              title="Download as ZIP — Ctrl+S"
            >
              <Archive className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">ZIP</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onClearAll}
          disabled={isProcessing}
          className="btn btn-ghost btn-icon"
          aria-label="Clear all images"
          title="Clear all images — Delete"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
