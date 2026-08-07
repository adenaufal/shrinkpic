import React from 'react';
import { History, Trash2, Clock, FileImage, X } from 'lucide-react';
import { Dialog, DialogClose, DialogPanel } from './ui/dialog';
import { HistorySession } from '../hooks/useCompressionHistory';
import { formatFileSize } from '../utils/format';
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
      <DialogPanel className="max-w-3xl" aria-describedby="history-panel-subtitle">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogPrimitive.Title className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                Compression History
              </DialogPrimitive.Title>
              <DialogPrimitive.Description
                id="history-panel-subtitle"
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                {history.length} session{history.length !== 1 ? 's' : ''}
              </DialogPrimitive.Description>
            </div>
          </div>
          <DialogClose asChild>
            <button
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Close history"
            >
              <X className="w-6 h-6" />
            </button>
          </DialogClose>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <History className="w-8 h-8 text-gray-400 dark:text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No history yet
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your compression sessions will appear here
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

                return (
                  <div
                    key={session.id}
                    className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(session.timestamp)}</span>
                      </div>
                      <button
                        onClick={() => onDeleteSession(session.id)}
                        className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        aria-label="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <FileImage className="w-3 h-3" />
                          <span>Images</span>
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {session.images.length}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Format
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100 uppercase">
                          {session.settings.format}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Quality
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {Math.round(session.settings.quality * 100)}%
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Saved
                        </div>
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          {overallRatio.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="text-gray-600 dark:text-gray-400">
                        {formatFileSize(totalOriginalSize)} → {formatFileSize(totalCompressedSize)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="flex items-center justify-between p-4 md:p-6 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-gray-900/50">
            <button
              onClick={onClearHistory}
              className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear All History
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing last {Math.min(history.length, 20)} sessions
            </p>
          </div>
        )}
      </DialogPanel>
    </Dialog>
  );
};
