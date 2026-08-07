import React from 'react';
import { Zap, Github, Heart, Menu, Moon, Sun, History } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  historyCount: number;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({ historyCount, onOpenHistory }) => {
  const { theme, toggleTheme } = useTheme();

  const historyLabel = `Compression history${historyCount > 0 ? ` (${historyCount} sessions)` : ''}`;

  return (
    <>
      {/* Mobile Navigation */}
      <div className="sticky top-0 z-50 bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border md:hidden transition-colors duration-300">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ImageCompress
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenHistory}
              className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label={historyLabel}
              title={historyLabel}
            >
              <History className="w-5 h-5 dark:text-gray-200" />
              {historyCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-blue-600 rounded-full">
                  {historyCount}
                </span>
              )}
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-500" />}
            </button>
            <Sheet>
              <SheetTrigger asChild>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" aria-label="Open menu">
                  <Menu className="w-5 h-5 dark:text-gray-200" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-white dark:bg-dark-card p-6">
              <SheetHeader>
                <SheetTitle className="dark:text-gray-100">About ImageCompress</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col space-y-6 mt-4">
                {/* Hero Text */}
                <div className="p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950 dark:via-dark-bg dark:to-purple-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                    Ultra-powerful image compression that reduces file sizes by up to 90% while maintaining stunning visual quality.
                  </p>
                </div>

                {/* Feature Highlights */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Features</h3>
                  <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium dark:text-gray-200">Free & Privacy-focused</span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium dark:text-gray-200">Lightning fast processing</span>
                  </div>
                  <a
                    href="https://github.com/adenaufal/imagecompress"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Github className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium dark:text-gray-200">Open source</span>
                  </a>
                </div>

                {/* Footer Content */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-dark-border">
                  <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                    <p>
                      Built with ❤️ by{' '}
                      <a
                        href="https://github.com/adenaufal"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        adenaufal
                      </a>
                    </p>
                    <p className="mt-2 text-xs">
                      All processing happens locally in your browser
                    </p>
                  </div>
                </div>
              </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <header className="text-center mb-8 md:mb-12 hidden md:block">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ImageCompress
          </h1>
          <button
            onClick={onOpenHistory}
            className="relative p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-300 transform hover:scale-105"
            aria-label={historyLabel}
            title={`${historyLabel} — Ctrl+H`}
          >
            <History className="w-6 h-6 dark:text-gray-200" />
            {historyCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[1.15rem] h-[1.15rem] px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-blue-600 rounded-full">
                {historyCount}
              </span>
            )}
          </button>
          <button
            onClick={toggleTheme}
            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-300 transform hover:scale-105"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6 text-yellow-500" />}
          </button>
        </div>

        <p className="text-xl text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
          Ultra-powerful image compression that reduces file sizes by up to 90%
          while maintaining stunning visual quality
        </p>

        <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <Heart className="w-4 h-4 text-red-500" />
            <span>Free & Privacy-focused</span>
          </div>
          <div className="flex items-center space-x-1">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>Lightning fast processing</span>
          </div>
          <a
            href="https://github.com/adenaufal/imagecompress"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>Open source</span>
          </a>
        </div>
      </header>

      {/* Mobile Header Content - Hidden on mobile */}
      <div className="px-4 pb-6 hidden">
        <p className="text-base text-gray-600 text-center mb-8">
          Ultra-powerful image compression that reduces file sizes by up to 90% 
          while maintaining stunning visual quality
        </p>
      </div>
    </>
  );
};