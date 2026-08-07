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

/** The parts of a keydown event a shortcut match depends on. */
export type ShortcutKeyEvent = Pick<
  KeyboardEvent,
  'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'
>;

/** Text entry swallows every shortcut — the user is typing, not commanding. */
export const isTypingTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  if (!element || typeof element.tagName !== 'string') return false;
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT' ||
    element.isContentEditable === true
  );
};

export const matchesShortcut = (event: ShortcutKeyEvent, shortcut: KeyboardShortcut): boolean => {
  // An unspecified modifier means "must NOT be held". Treating it as
  // "don't care" made plain Delete fire on Ctrl+Delete too, wiping the
  // whole queue by accident.
  const modifierHeld = event.ctrlKey || event.metaKey;
  const ctrlMatch = shortcut.ctrl ? modifierHeld : !modifierHeld;
  const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
  const altMatch = shortcut.alt ? event.altKey : !event.altKey;
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

  return ctrlMatch && shiftMatch && altMatch && keyMatch;
};

/**
 * True while a modal (Radix marks its content `role="dialog"`/`"alertdialog"`
 * with `data-state="open"`) is on screen.
 *
 * The callers pass an `enabled` flag for this, but the DOM check is the
 * backstop that matters: a global Delete handler that fires from inside the
 * image editor clears the whole queue and takes the user's unsaved edit with
 * it, and Ctrl+Enter starts a batch behind the open dialog.
 */
export const hasOpenDialog = (doc: Document | undefined = typeof document === 'undefined' ? undefined : document): boolean => {
  if (!doc) return false;
  return Boolean(
    doc.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')
  );
};

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
      if (isTypingTarget(event.target) || hasOpenDialog()) {
        return;
      }

      shortcutsRef.current.forEach((shortcut) => {
        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
};
