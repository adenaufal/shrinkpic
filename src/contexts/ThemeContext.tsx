import React, { createContext, useEffect, useState } from 'react';
import { safeStorage } from '../utils/safeStorage';

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Exported (not just the provider) so `useTheme` can live in its own file —
// keeping this file to a single component export is what silences
// react-refresh/only-export-components; a context object is a stable
// reference, so re-exporting it does not defeat fast refresh.
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Storage access can throw (private browsing, embedded WebViews), and a
    // throw here would blank the app before it ever painted.
    const savedTheme = safeStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    try {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // matchMedia is missing in some very old WebViews.
    }

    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    safeStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
