import React from 'react';
import { Gauge, Gift, ShieldCheck } from 'lucide-react';

const features = [
  {
    icon: ShieldCheck,
    title: 'Private',
    detail: 'Files never leave the tab',
    accent: 'text-green-600 dark:text-green-400',
  },
  {
    icon: Gauge,
    title: 'Fast',
    detail: 'Batch compression, no queue',
    accent: 'text-blue-600 dark:text-blue-400',
  },
  {
    icon: Gift,
    title: 'Free',
    detail: 'No signup, no limits, MIT',
    accent: 'text-purple-600 dark:text-purple-400',
  },
];

const trustBadgeClass =
  'inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-green-700 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300';

interface HeroProps {
  /** Once there is work in the queue the pitch shrinks to a single line. */
  compact?: boolean;
}

/**
 * The value proposition, shown at every breakpoint. Local-only processing is
 * the one thing server-based compressors structurally cannot claim, so it
 * leads — and the trust badge stays visible on mobile too.
 */
export const Hero: React.FC<HeroProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <section className="mt-6 mb-6 flex flex-col items-center gap-2 text-center md:mt-2 md:flex-row md:justify-between md:gap-4 md:text-left">
        <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
          Compress images in your browser.{' '}
          <span className="font-normal text-gray-600 dark:text-gray-400">
            Nothing ever leaves your device.
          </span>
        </h1>
        <p className={`${trustBadgeClass} shrink-0`}>
          <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          0 bytes uploaded
        </p>
      </section>
    );
  }

  return (
    <section className="text-center mt-6 mb-8 md:mt-2 md:mb-10">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        Compress images in your browser.
        <span className="block bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
          Nothing ever leaves your device.
        </span>
      </h1>

      <p className="mt-3 mx-auto max-w-2xl text-sm sm:text-base text-gray-600 dark:text-gray-300">
        JPG, PNG, WebP and AVIF are resized and re-encoded by your own browser. No uploads, no
        accounts, no tracking — turn off your Wi-Fi and it still works.
      </p>

      <p className={`mt-4 ${trustBadgeClass}`}>
        <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
        0 bytes uploaded &middot; works offline
      </p>

      <ul className="mt-6 grid grid-cols-3 gap-2 sm:gap-4 mx-auto max-w-2xl">
        {features.map(({ icon: Icon, title, detail, accent }) => (
          <li
            key={title}
            className="rounded-xl border border-gray-200 bg-white/70 px-2 py-3 sm:px-4 dark:border-dark-border dark:bg-dark-card/70"
          >
            <Icon className={`w-5 h-5 mx-auto ${accent}`} aria-hidden="true" />
            <p className="mt-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
            <p className="mt-0.5 text-[11px] sm:text-xs leading-snug text-gray-500 dark:text-gray-400">
              {detail}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};
