import React, { useState } from 'react';
import { Github } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

const REPO_URL = 'https://github.com/adenaufal/imagecompress';

const linkClass =
  'rounded text-gray-600 underline-offset-2 transition-colors hover:text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:text-blue-400';

const sectionTitleClass = 'mt-5 text-sm font-semibold text-gray-900 dark:text-gray-100';
const bodyClass = 'mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400';

type Panel = 'privacy' | 'about' | null;

/**
 * Footer plus the two in-app pages a privacy-positioned product has to be able
 * to point at. Both are modals rather than routes — the app is a single screen
 * and adding a router for two paragraphs would not earn its weight.
 */
export const SiteFooter: React.FC = () => {
  const [panel, setPanel] = useState<Panel>(null);

  return (
    <>
      <footer className="mt-16 border-t border-gray-200 py-8 text-center text-sm text-gray-500 dark:border-dark-border dark:text-gray-400">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <button type="button" className={linkClass} onClick={() => setPanel('privacy')}>
            Privacy
          </button>
          <button type="button" className={linkClass} onClick={() => setPanel('about')}>
            About
          </button>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkClass} inline-flex items-center gap-1.5`}
          >
            <Github className="w-4 h-4" aria-hidden="true" />
            GitHub
          </a>
        </nav>

        <p className="mt-4">
          &copy; {new Date().getFullYear()} ImageCompress &middot; MIT licensed &middot; every image
          is processed on your device
        </p>
      </footer>

      <Dialog open={panel === 'privacy'} onOpenChange={(open) => !open && setPanel(null)}>
        <DialogContent aria-describedby="privacy-summary">
          <DialogTitle>Privacy</DialogTitle>
          <DialogDescription id="privacy-summary">
            Short version: your images are never uploaded, and there is no server to upload them to.
          </DialogDescription>

          <h3 className={sectionTitleClass}>Your images</h3>
          <p className={bodyClass}>
            Every file you add is decoded and re-encoded by your own browser. Nothing is transmitted,
            stored remotely, or seen by anyone else. You can verify it: open your browser's developer
            tools, switch to the Network tab, and compress an image — there are no requests. The app
            also keeps working with the network disconnected.
          </p>

          <h3 className={sectionTitleClass}>What is stored on your device</h3>
          <p className={bodyClass}>
            Two things live in this site's <code>localStorage</code>, and nowhere else:{' '}
            <code>imagecompress_history</code> (file names, byte sizes and the settings used for each
            compression run, shown in the History panel) and <code>theme</code> (your light/dark
            choice). Clear the history from the History panel, or clear this site's data in your
            browser, and both are gone.
          </p>

          <h3 className={sectionTitleClass}>No tracking, no third parties</h3>
          <p className={bodyClass}>
            There are no accounts, no analytics, no advertising, and no cookies. Fonts and every
            other asset are served from this site itself, so loading the page makes no third-party
            requests. An offline service worker caches the app's own files so it can run without a
            connection.
          </p>

          <h3 className={sectionTitleClass}>Verify it yourself</h3>
          <p className={bodyClass}>
            The full source is public under the MIT license at{' '}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
            >
              github.com/adenaufal/imagecompress
            </a>
            .
          </p>
        </DialogContent>
      </Dialog>

      <Dialog open={panel === 'about'} onOpenChange={(open) => !open && setPanel(null)}>
        <DialogContent aria-describedby="about-summary">
          <DialogTitle>About ImageCompress</DialogTitle>
          <DialogDescription id="about-summary">
            A free image compressor that runs entirely on your device.
          </DialogDescription>

          <p className={bodyClass}>
            ImageCompress resizes and re-encodes JPG, PNG, WebP, AVIF, GIF and BMP files using your
            browser's own image pipeline. Drop in a batch, pick a preset or dial in quality, format
            and maximum dimension yourself, then download the results individually or as a ZIP.
          </p>

          <h3 className={sectionTitleClass}>What it does</h3>
          <ul className={`${bodyClass} list-disc space-y-1 pl-5`}>
            <li>Batch compression with quality, format and size presets</li>
            <li>Before/after comparison slider and a built-in editor</li>
            <li>Single-file download, ZIP export, or copy to clipboard</li>
            <li>A history of past runs, kept only on this device</li>
            <li>Installable and fully usable offline</li>
          </ul>

          <h3 className={sectionTitleClass}>Open source</h3>
          <p className={bodyClass}>
            Built with React, TypeScript, Vite and Tailwind CSS by{' '}
            <a
              href="https://github.com/adenaufal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
            >
              adenaufal
            </a>
            , and released under the MIT license. Bug reports and pull requests are welcome on{' '}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
            >
              GitHub
            </a>
            .
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};
