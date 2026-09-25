/** True on macOS and iOS, where shortcuts use ⌘ instead of Ctrl. */
export const isApplePlatform = (): boolean => {
  try {
    return /Mac|iPhone|iPad/.test(navigator.userAgent);
  } catch {
    return false;
  }
};

/** The label for the shortcut modifier key on this platform. */
export const modifierKeyLabel = (): string => (isApplePlatform() ? '⌘' : 'Ctrl');
