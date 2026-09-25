import React from 'react';
import { Trash2, Clock, X } from 'lucide-react';
import { Dialog, DialogClose, DialogPanel } from './ui/dialog';
import { HistorySession } from '../hooks/useCompressionHistory';
import { formatFileSize } from '../utils/format';
import { formatLabelFromMime, MIME_BY_FORMAT } from '../utils/imageCompression';
import { countKeptOriginalFormat } from '../utils/historyStats';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface HistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: HistorySession[];
  onDeleteSession: (id: string) => void;
  onClearHistory: () => void;
}

/**
 * Built on Radix Dialog rather than a hand-rolled overlay, so focus trap,
 * focus restore, Escape-to-close, backdrop-click-to-close and body scroll
 * lock all come for free instead of being reimplemented (and half-missed).
 */
export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  open,
  onOpenChange,
  history,
  onDeleteSession,
  onClearHistory,
}) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPanel className="max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 dark:border-dark-border md:p-6">
          <div>
            <DialogPrimitive.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Compression history
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {history.length} session{history.length !== 1 ? 's' : ''}, kept only on this device
            </DialogPrimitive.Description>
          </div>
          <DialogClose asChild>
            <button className="btn btn-ghost btn-icon -mr-2" aria-label="Close history">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </DialogClose>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {history.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No history yet</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Runs you compress will be listed here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((session) => {
                const totalOriginalSize = session.images.reduce(
                  (sum, img) => sum + img.originalSize,
                  0
                );
                // Files that failed contribute their original size, so a
                // session can never claim a saving it did not make.
                const totalCompressedSize = session.images.reduce(
                  (sum, img) => sum + (img.compressedSize ?? img.originalSize),
                  0
                );
                const overallRatio =
                  totalOriginalSize > 0
                    ? Math.max(
                        0,
                        ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100
                      )
                    : 0;
                // "Format" below records what was requested for the batch —
                // any image whose re-encode came out larger keeps its
                // original format instead, so the actual bytes on disk can
                // differ from that setting. Surface it rather than implying
                // every file matches.
                const requestedFormatLabel = formatLabelFromMime(
                  MIME_BY_FORMAT[session.settings.format]
                );
                const keptOriginalFormatCount = countKeptOriginalFormat(
                  session.images,
                  session.settings.format
                );

                return (
                  <div
                    key={session.id}
                    className="rounded-xl border border-gray-200 p-4 dark:border-dark-border"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        <span>{formatDate(session.timestamp)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteSession(session.id)}
                        className="btn btn-ghost btn-icon -mr-2 -mt-2"
                        aria-label={`Delete the session from ${formatDate(session.timestamp)}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {session.images.length} image{session.images.length === 1 ? '' : 's'}
                      {' · '}
                      {formatFileSize(totalOriginalSize)} → {formatFileSize(totalCompressedSize)}
                      {' · '}
                      <span className="font-semibold text-brand-600 dark:text-brand-400">
                        {overallRatio.toFixed(0)}% smaller
                      </span>
                    </p>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {requestedFormatLabel} · {Math.round(session.settings.quality * 100)}% quality
                      {keptOriginalFormatCount > 0 && (
                        <span title="These files' re-encode was not smaller, so their original format was kept instead of converting.">
                          {' · '}
                          {keptOriginalFormatCount} kept original
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="flex items-center justify-between gap-4 border-t border-gray-200 p-4 dark:border-dark-border md:px-6">
            <button
              type="button"
              onClick={onClearHistory}
              className="btn btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear history
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last {Math.min(history.length, 20)} sessions
            </p>
          </div>
        )}
      </DialogPanel>
    </Dialog>
  );
};
