import React from 'react';
import { Archive, Download, RefreshCw, Trash2, Zap } from 'lucide-react';

interface ActionBarProps {
  onCompress: () => void;
  onDownloadAll: () => void;
  onDownloadAsZip: () => void;
  onClearAll: () => void;
  isProcessing: boolean;
  imageCount: number;
  hasResults: boolean;
  /** Images with no result yet (new, or failed last time). */
  pendingCount: number;
  /** The settings differ from the ones the current results were made with. */
  settingsChanged: boolean;
}

/**
 * Every action that applies to the whole queue. Exactly one button is the
 * gradient primary, chosen by what the user most likely wants next:
 *
 * - nothing compressed yet, new images, or changed settings → Compress
 * - everything compressed with the current settings → Download all
 *
 * One element, two layouts: a fixed bar along the bottom of the screen below
 * `lg` (`App` reserves its height), and a stacked block in the workspace
 * sidebar from `lg` up. Its ancestors must never be transformed — a
 * transform would make `position: fixed` relative to them instead of the
 * viewport.
 */
export const ActionBar: React.FC<ActionBarProps> = ({
  onCompress,
  onDownloadAll,
  onDownloadAsZip,
  onClearAll,
  isProcessing,
  imageCount,
  hasResults,
  pendingCount,
  settingsChanged,
}) => {
  const compressIsPrimary = !hasResults || settingsChanged || pendingCount > 0 || isProcessing;

  const compressLabel = isProcessing
    ? 'Compressing…'
    : !hasResults
    ? `Compress ${imageCount} image${imageCount === 1 ? '' : 's'}`
    : settingsChanged
    ? 'Apply new settings'
    : pendingCount > 0
    ? `Compress ${pendingCount} more`
    : 'Compress again';

  // Below 400px, with Download/ZIP beside it, the primary has about 130px:
  // it shows a one-word label there (the full one stays its accessible name).
  const label = (full: string, short: string) =>
    hasResults ? (
      <>
        <span className="relative truncate min-[400px]:hidden">{short}</span>
        <span className="relative hidden truncate min-[400px]:inline">{full}</span>
      </>
    ) : (
      <span className="relative truncate">{full}</span>
    );

  const shortCompressLabel = isProcessing ? 'Working…' : settingsChanged ? 'Apply' : 'Compress';

  const compressButton = (
    <button
      type="button"
      onClick={onCompress}
      disabled={isProcessing}
      className={
        compressIsPrimary
          ? `btn btn-gradient min-w-0 flex-1 ${hasResults ? 'lg:basis-full' : ''} ${
              isProcessing ? 'is-busy disabled:cursor-progress disabled:opacity-90' : ''
            }`
          : 'btn btn-secondary btn-icon lg:w-auto lg:flex-1 lg:px-3'
      }
      aria-label={compressLabel}
      title={`${compressLabel} — Ctrl+Enter`}
    >
      {compressIsPrimary ? (
        <Zap className={`relative h-4 w-4 shrink-0 ${isProcessing ? 'animate-pulse' : ''}`} aria-hidden="true" />
      ) : (
        <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {compressIsPrimary ? (
        label(compressLabel, shortCompressLabel)
      ) : (
        <span className="hidden truncate lg:inline">{compressLabel}</span>
      )}
    </button>
  );

  const downloadButton = hasResults && (
    <button
      type="button"
      onClick={onDownloadAll}
      className={
        compressIsPrimary
          ? 'btn btn-secondary btn-icon lg:w-auto lg:flex-1 lg:px-3'
          : 'btn btn-gradient min-w-0 flex-1 animate-pop-in lg:basis-full'
      }
      aria-label="Download all compressed images"
      title="Download every compressed image — Ctrl+Shift+D"
    >
      <Download className="relative h-4 w-4 shrink-0" aria-hidden="true" />
      {compressIsPrimary ? (
        <span className="hidden truncate lg:inline">Download all</span>
      ) : (
        label('Download all', 'Download')
      )}
    </button>
  );

  return (
    <div
      role="group"
      aria-label="Actions for all images"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-gray-50/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-dark-border dark:bg-dark-bg/95 lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none lg:dark:bg-transparent"
    >
      {settingsChanged && !isProcessing && (
        <p className="mb-3 hidden items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 lg:flex">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          The settings changed since the last run. Apply them to update the results.
        </p>
      )}

      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 lg:flex-wrap">
        {/* The primary always comes first so that, in the sidebar layout, it
            spans a row of its own above the secondary buttons (when there
            are any — before the first run it shares a row with Clear). */}
        {compressIsPrimary ? compressButton : downloadButton}
        {compressIsPrimary ? downloadButton : compressButton}

        {hasResults && (
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
