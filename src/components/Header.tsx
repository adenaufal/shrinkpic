import React, { useState } from 'react';
import { Github, History, Keyboard, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { Logo } from './art/Logo';

interface HeaderProps {
  historyCount: number;
  onOpenHistory: () => void;
  onOpenShortcuts: () => void;
  /** A batch is compressing — the logo keeps pressing until it is done. */
  busy?: boolean;
}

const REPO_URL = 'https://github.com/adenaufal/shrinkpic';

/**
 * One brand bar for every breakpoint — the previous version shipped a separate
 * mobile and desktop header (plus a slide-out menu that restated the hero and
 * the footer), so the same three controls existed three times in the DOM.
 * The value proposition lives in <Landing>, the long-form copy in <SiteFooter>.
 */
export const Header: React.FC<HeaderProps> = ({
  historyCount,
  onOpenHistory,
  onOpenShortcuts,
  busy = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  // Remounting the logo replays its one-shot squeeze.
  const [logoTake, setLogoTake] = useState(0);

  const historyLabel = `Compression history${historyCount > 0 ? ` (${historyCount} sessions)` : ''}`;
  const themeLabel = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-gray-50/75 backdrop-blur-md dark:border-dark-border/80 dark:bg-dark-bg/75">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 md:h-16 lg:px-8">
        <div
          className="flex min-w-0 items-center gap-2"
          onPointerEnter={() => {
            if (!busy) setLogoTake((take) => take + 1);
          }}
        >
          <Logo key={logoTake} busy={busy} className="h-7 w-7 shrink-0" />
          <span className="truncate text-base font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            Shrinkpic
          </span>
        </div>

        <nav className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenHistory}
            className="btn btn-ghost btn-icon sm:w-auto sm:px-3"
            aria-label={historyLabel}
            title={`${historyLabel} — Ctrl+H`}
          >
            <History className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              // Keyed on the count so it pops each time a run is recorded.
              <span
                key={historyCount}
                className="hidden animate-pop-in rounded-full bg-brand-100 px-1.5 text-xs font-semibold tabular-nums text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 sm:inline"
                aria-hidden="true"
              >
                {historyCount}
              </span>
            )}
          </button>
          {/* Shortcuts need a keyboard, so the button only appears where one
              is likely. */}
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="btn btn-ghost btn-icon hidden md:inline-flex"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts — ?"
          >
            <Keyboard className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-ghost btn-icon"
            aria-label={themeLabel}
            title={themeLabel}
          >
            {/* Keyed so the incoming icon spins in on every toggle. */}
            {theme === 'light' ? (
              <Moon
                key="moon"
                className="h-5 w-5 animate-in fade-in-0 spin-in-90 zoom-in-50 duration-500"
                aria-hidden="true"
              />
            ) : (
              <Sun
                key="sun"
                className="h-5 w-5 animate-in fade-in-0 spin-in-90 zoom-in-50 duration-500"
                aria-hidden="true"
              />
            )}
          </button>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-icon"
            aria-label="View the source on GitHub"
            title="View the source on GitHub"
          >
            <Github className="h-5 w-5" aria-hidden="true" />
          </a>
        </nav>
      </div>
    </header>
  );
};
