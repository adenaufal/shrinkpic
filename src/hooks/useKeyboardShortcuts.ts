import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

/**
 * Custom hook for managing keyboard shortcuts
 * @param shortcuts Array of keyboard shortcut configurations
 * @param enabled Whether shortcuts are enabled (default: true)
 */
export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      shortcuts.forEach((shortcut) => {
        // An unspecified modifier means "must NOT be held". Treating it as
        // "don't care" made plain Delete fire on Ctrl+Delete too, wiping the
        // whole queue by accident.
        const modifierHeld = event.ctrlKey || event.metaKey;
        const ctrlMatch = shortcut.ctrl ? modifierHeld : !modifierHeld;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
};

/**
 * Get a formatted string representation of a keyboard shortcut
 */
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];

  if (shortcut.ctrl) {
    // Use Cmd symbol on Mac, Ctrl on others
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');

  parts.push(shortcut.key.toUpperCase());

  return parts.join('+');
};
