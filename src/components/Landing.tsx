import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Sparkles } from 'lucide-react';
import { HeroArt } from './art/HeroArt';
import { FileUpload } from './FileUpload';
import { Features } from './Features';
import { createSampleImage } from '../utils/sampleImage';

interface LandingProps {
  onFileSelect: (files: File[]) => void;
  isProcessing: boolean;
}

/**
 * A tongue-in-cheek "live" meter that never moves: the upload counter is
 * wired to nothing, because nothing is ever uploaded.
 */
const UploadMeter: React.FC = () => (
  <p className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 py-1 pl-2.5 pr-3 text-xs font-medium text-gray-600 backdrop-blur dark:border-dark-border dark:bg-dark-card/70 dark:text-gray-300">
    <span className="relative flex h-2 w-2" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
    Bytes uploaded:
    <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-50">0</span>
  </p>
);

/**
 * The empty state. The drop zone sits directly under the headline, so the
 * one thing to do on this page is above the fold on every screen: on phones
 * the illustration follows it, from `lg` up it stands beside it.
 *
 * Local-only processing is the one thing a server-based compressor cannot
 * claim, so it leads the copy.
 */
export const Landing: React.FC<LandingProps> = ({ onFileSelect, isProcessing }) => {
  const [makingSample, setMakingSample] = useState(false);

  const trySample = async () => {
    setMakingSample(true);
    try {
      onFileSelect([await createSampleImage()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the sample image.');
    } finally {
      setMakingSample(false);
    }
  };

  return (
    <>
      <section className="grid items-center gap-10 pb-12 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:pb-16 lg:pt-14">
        <div className="mx-auto w-full max-w-2xl text-center lg:mx-0 lg:max-w-none lg:text-left">
          <div className="animate-fade-up">
            <UploadMeter />
          </div>
          <h1 className="mt-4 animate-fade-up text-4xl font-semibold tracking-tight text-gray-900 [animation-delay:80ms] dark:text-gray-50 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
            Compress images{' '}
            <span className="text-gradient whitespace-nowrap">in your browser</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl animate-fade-up text-base leading-relaxed text-gray-600 [animation-delay:160ms] dark:text-gray-400 sm:text-lg lg:mx-0">
            Resize and re-encode photos, screenshots and graphics right on this page. No accounts,
            no limits, and no server ever sees your files.
          </p>

          <div className="mt-7 animate-fade-up [animation-delay:220ms]">
            <FileUpload onFileSelect={onFileSelect} isProcessing={isProcessing} />
          </div>

          <div className="mt-2 flex animate-fade-up justify-center [animation-delay:300ms] lg:justify-start">
            <button
              type="button"
              onClick={() => void trySample()}
              disabled={makingSample || isProcessing}
              className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand-600 underline-offset-4 transition-colors hover:text-brand-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-progress disabled:opacity-60 dark:text-brand-400 dark:hover:text-brand-300 lg:-ml-2"
            >
              {makingSample ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              No photo handy? Try a sample image
            </button>
          </div>
        </div>

        <HeroArt className="mx-auto w-full max-w-sm animate-fade-up [animation-delay:240ms] sm:max-w-md lg:max-w-none" />
      </section>

      <Features />
    </>
  );
};
