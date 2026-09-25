import React, { useEffect, useRef, useState } from 'react';
import { Images } from 'lucide-react';
import { formatFileSize } from '../utils/format';
import { useCountUp } from '../hooks/useCountUp';
import { SavingsRing } from './ui/SavingsRing';
import { PixelBurst } from './ui/PixelBurst';
import { ProgressBar } from './ui/ProgressBar';
import type { QueuedImage } from '../types';

export interface BatchProgress {
  total: number;
  finished: number;
}

interface BatchPanelProps {
  images: QueuedImage[];
  isProcessing: boolean;
  /** Set while a run is in flight. */
  batch: BatchProgress | null;
  /** The action bar, rendered inside the card on large screens. */
  children: React.ReactNode;
}

/**
 * The batch at a glance — the first thing in the workspace. A ring gauge and
 * one headline figure that answer "where am I": how many images are waiting,
 * how far the current run has got, or how much space the results saved.
 *
 * No entrance animation on this card on purpose: it contains the action bar,
 * which is `position: fixed` on small screens, and an animated transform on
 * an ancestor would drag that bar along with it.
 */
export const BatchPanel: React.FC<BatchPanelProps> = ({ images, isProcessing, batch, children }) => {
  const doneCount = images.filter((image) => image.result).length;
  const failedCount = images.filter((image) => image.status === 'error').length;
  const waitingCount = images.filter((image) => image.status === 'idle').length;

  const totalOriginal = images.reduce((sum, image) => sum + image.file.size, 0);
  const totalCompressed = images.reduce(
    (sum, image) => sum + (image.result?.compressedSize ?? image.file.size),
    0
  );
  const saved = Math.max(0, totalOriginal - totalCompressed);
  const savedRatio = totalOriginal > 0 ? (saved / totalOriginal) * 100 : 0;

  // Overall progress of the run in flight: finished images count in full,
  // the ones still working count for their own percentage.
  const runProgress = batch
    ? Math.min(
        100,
        ((batch.finished * 100 +
          images
            .filter((image) => image.status === 'processing')
            .reduce((sum, image) => sum + (image.progress ?? 0), 0)) /
          Math.max(batch.total, 1))
      )
    : 0;

  const showingRun = isProcessing && batch !== null;
  const shownRatio = useCountUp(showingRun ? runProgress : savedRatio, showingRun ? 300 : 1000);
  const shownSaved = useCountUp(saved, 1000);

  // Pixel confetti from the gauge when a run finishes with at least one result.
  const [burst, setBurst] = useState(0);
  const wasProcessing = useRef(isProcessing);
  useEffect(() => {
    if (wasProcessing.current && !isProcessing && doneCount > 0) {
      setBurst((count) => count + 1);
    }
    wasProcessing.current = isProcessing;
  }, [isProcessing, doneCount]);

  let headline: React.ReactNode;
  let detail: React.ReactNode;
  if (showingRun) {
    // Several images compress in parallel, so "N of M done" is the honest
    // count — "compressing image 3" would be a guess.
    headline = 'Compressing…';
    detail = (
      <span className="tabular-nums">
        {batch.finished} of {batch.total} done · keep this tab open
      </span>
    );
  } else if (doneCount > 0) {
    headline = (
      <>
        Saved{' '}
        <span className="text-gradient tabular-nums">{formatFileSize(Math.round(shownSaved))}</span>
        <span className="sr-only">, {savedRatio.toFixed(0)}% smaller</span>
      </>
    );
    detail = (
      <span className="tabular-nums">
        {formatFileSize(totalOriginal)} → {formatFileSize(totalCompressed)}
      </span>
    );
  } else {
    headline = (
      <>
        {images.length} image{images.length === 1 ? '' : 's'} ready
      </>
    );
    detail = <span className="tabular-nums">{formatFileSize(totalOriginal)} in total</span>;
  }

  const chips = [
    doneCount > 0 && { label: `${doneCount} done`, tone: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' },
    failedCount > 0 && { label: `${failedCount} failed`, tone: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
    waitingCount > 0 &&
      doneCount > 0 && { label: `${waitingCount} new`, tone: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  ].filter(Boolean) as { label: string; tone: string }[];

  return (
    <section className="surface p-4" aria-labelledby="batch-heading">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <SavingsRing percent={showingRun || doneCount > 0 ? shownRatio : 0} size={60} />
          <span
            className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums text-gray-900 dark:text-gray-100"
            aria-hidden="true"
          >
            {showingRun || doneCount > 0 ? (
              `${shownRatio.toFixed(0)}%`
            ) : (
              <Images className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            )}
          </span>
          <PixelBurst trigger={burst} />
        </div>

        <div className="min-w-0">
          <h2 id="batch-heading" className="text-base font-semibold text-gray-900 dark:text-gray-50">
            {headline}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{detail}</p>
          {chips.length > 0 && !showingRun && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Status">
              {chips.map((chip) => (
                <li key={chip.label} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.tone}`}>
                  {chip.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showingRun && (
        <div className="mt-4" aria-hidden="true">
          <ProgressBar progress={runProgress} />
        </div>
      )}

      {/* The action bar pins itself to the bottom of the screen below `lg`,
          so this wrapper only takes space in the sidebar layout. */}
      <div className="lg:mt-4">{children}</div>
    </section>
  );
};
