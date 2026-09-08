import React from 'react';
import { Github, Moon, Sun, History } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
  historyCount: number;
  onOpenHistory: () => void;
}

const REPO_URL = 'https://github.com/adenaufal/shrinkpic';

/**
 * One brand bar for every breakpoint — the previous version shipped a separate
 * mobile and desktop header (plus a slide-out menu that restated the hero and
 * the footer), so the same three controls existed three times in the DOM.
 * The value proposition lives in <Hero>, the long-form copy in <SiteFooter>.
 */
export const Header: React.FC<HeaderProps> = ({ historyCount, onOpenHistory }) => {
  const { theme, toggleTheme } = useTheme();

  const historyLabel = `Compression history${historyCount > 0 ? ` (${historyCount} sessions)` : ''}`;
  const themeLabel = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-gray-50/85 backdrop-blur dark:border-dark-border dark:bg-dark-bg/85">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 md:h-16">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/favicon.svg" alt="" aria-hidden="true" className="h-7 w-7 shrink-0" />
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
            <span className="hidden sm:inline">
              History{historyCount > 0 ? ` (${historyCount})` : ''}
            </span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-ghost btn-icon"
            aria-label={themeLabel}
            title={themeLabel}
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Sun className="h-5 w-5" aria-hidden="true" />
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
