import { useEffect, useRef } from 'react';

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
 * Custom hook for managing keyboard shortcuts.
 *
 * `shortcuts` is read through a ref that is refreshed on every render rather
 * than being a `useEffect` dependency directly. App builds that array from an
 * inline literal, so its identity changes on every render (including on
 * every per-file progress tick); depending on it directly would tear down and
 * rebuild the global `keydown` listener dozens of times per batch. The ref
 * lets the effect depend on `enabled` alone and bind the listener exactly
 * once, while `handleKeyDown` always sees the latest shortcut definitions.
 *
 * @param shortcuts Array of keyboard shortcut configurations
 * @param enabled Whether shortcuts are enabled (default: true)
 */
export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) => {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

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

      shortcutsRef.current.forEach((shortcut) => {
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
  }, [enabled]);
};
