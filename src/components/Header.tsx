import React from 'react';
import { Github, Menu, Moon, Sun, History, ShieldCheck, WifiOff, Coins } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  historyCount: number;
  onOpenHistory: () => void;
}

const REPO_URL = 'https://github.com/adenaufal/imagecompress';

/** The product mark: a photo squeezed between two arrows. */
const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <img src="/favicon.svg" alt="" aria-hidden="true" className={className} />
);

/**
 * Brand bar only. The value proposition lives in <Hero> so it renders once,
 * at every breakpoint, instead of being duplicated per viewport.
 */
export const Header: React.FC<HeaderProps> = ({ historyCount, onOpenHistory }) => {
  const { theme, toggleTheme } = useTheme();

  const historyLabel = `Compression history${historyCount > 0 ? ` (${historyCount} sessions)` : ''}`;
  const themeLabel = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';

  const historyBadge = historyCount > 0 && (
    <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-blue-600 rounded-full">
      {historyCount}
    </span>
  );

  return (
    <>
      {/* Mobile Navigation */}
      <div className="sticky top-0 z-50 -mx-4 bg-white/95 backdrop-blur dark:bg-dark-bg/95 border-b border-gray-200 dark:border-dark-border md:hidden transition-colors duration-300">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <Logo className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ImageCompress
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={onOpenHistory}
              className="relative p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label={historyLabel}
              title={historyLabel}
            >
              <History className="w-5 h-5 dark:text-gray-200" />
              {historyBadge}
            </button>
            <button
              onClick={toggleTheme}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label={themeLabel}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-500" />}
            </button>
            <Sheet>
              <SheetTrigger asChild>
                <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" aria-label="Open menu">
                  <Menu className="w-5 h-5 dark:text-gray-200" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto bg-white dark:bg-dark-card p-6">
                <SheetHeader>
                  <SheetTitle className="dark:text-gray-100">About ImageCompress</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-6 mt-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950 dark:via-dark-bg dark:to-purple-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                      Compress images in your browser. Nothing ever leaves your device — no uploads,
                      no accounts, no tracking.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Why it is different</h2>
                    <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      <span className="text-sm font-medium dark:text-gray-200">Files never leave the tab</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <WifiOff className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="text-sm font-medium dark:text-gray-200">Installable, works offline</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <Coins className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="text-sm font-medium dark:text-gray-200">Free, no signup, no limits</span>
                    </div>
                    <a
                      href={REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Github className="w-4 h-4 text-gray-600 dark:text-gray-400 shrink-0" />
                      <span className="text-sm font-medium dark:text-gray-200">Open source (MIT)</span>
                    </a>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-dark-border">
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                      Built by{' '}
                      <a
                        href="https://github.com/adenaufal"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        adenaufal
                      </a>
                    </p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Logo className="w-11 h-11 rounded-2xl" />
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ImageCompress
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            aria-label="View the source on GitHub"
            title="View the source on GitHub"
          >
            <Github className="w-5 h-5 dark:text-gray-200" />
          </a>
          <button
            onClick={onOpenHistory}
            className="relative p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            aria-label={historyLabel}
            title={`${historyLabel} — Ctrl+H`}
          >
            <History className="w-5 h-5 dark:text-gray-200" />
            {historyBadge}
          </button>
          <button
            onClick={toggleTheme}
            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            aria-label={themeLabel}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-500" />}
          </button>
        </div>
      </header>
    </>
  );
};
