import React from 'react';
import { Lock } from 'lucide-react';

interface HeroProps {
  /** Once there is work in the queue the pitch shrinks to a single line. */
  compact?: boolean;
}

/**
 * The value proposition. Local-only processing is the one thing a server-based
 * compressor structurally cannot claim, so it leads — and the privacy line
 * survives at every breakpoint, including the compact variant.
 */
export const Hero: React.FC<HeroProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <section className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-6">
        <h1 className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-50">
          Compress images in your browser
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nothing ever leaves your device.
        </p>
      </section>
    );
  }

  return (
    <section className="py-10 text-center md:py-14">
      <h1 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
        Compress images in your browser
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-gray-600 dark:text-gray-400">
        Resize and re-encode your photos, screenshots and graphics without uploading them. No
        accounts, no limits — turn off your Wi-Fi and it still works.
      </p>
      <p className="mt-4 inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
        0 bytes uploaded — every file stays on this device
      </p>
    </section>
  );
};
