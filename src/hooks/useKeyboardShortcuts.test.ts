import { afterEach, describe, expect, it } from 'vitest';
import {
  hasOpenDialog,
  isTypingTarget,
  matchesShortcut,
  type KeyboardShortcut,
} from './useKeyboardShortcuts';

const shortcut = (overrides: Partial<KeyboardShortcut>): KeyboardShortcut => ({
  key: 'Enter',
  action: () => {},
  description: 'test',
  ...overrides,
});

const keyEvent = (overrides: Partial<KeyboardEvent> & { key: string }) => ({
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...overrides,
});

describe('matchesShortcut', () => {
  it('accepts Ctrl or Cmd for a ctrl shortcut', () => {
    const compress = shortcut({ key: 'Enter', ctrl: true });
    expect(matchesShortcut(keyEvent({ key: 'Enter', ctrlKey: true }), compress)).toBe(true);
    expect(matchesShortcut(keyEvent({ key: 'Enter', metaKey: true }), compress)).toBe(true);
    expect(matchesShortcut(keyEvent({ key: 'Enter' }), compress)).toBe(false);
  });

  it('treats an unspecified modifier as "must not be held"', () => {
    // Ctrl+Delete used to wipe the whole queue by matching bare Delete.
    const clearAll = shortcut({ key: 'Delete' });
    expect(matchesShortcut(keyEvent({ key: 'Delete' }), clearAll)).toBe(true);
    expect(matchesShortcut(keyEvent({ key: 'Delete', ctrlKey: true }), clearAll)).toBe(false);
    expect(matchesShortcut(keyEvent({ key: 'Delete', shiftKey: true }), clearAll)).toBe(false);
  });

  it('distinguishes shifted variants of the same key', () => {
    const copy = shortcut({ key: 'c', ctrl: true, shift: true });
    const zip = shortcut({ key: 's', ctrl: true });
    expect(matchesShortcut(keyEvent({ key: 'C', ctrlKey: true, shiftKey: true }), copy)).toBe(true);
    expect(matchesShortcut(keyEvent({ key: 'c', ctrlKey: true }), copy)).toBe(false);
    expect(matchesShortcut(keyEvent({ key: 's', ctrlKey: true, shiftKey: true }), zip)).toBe(false);
  });
});

describe('isTypingTarget', () => {
  it('ignores keystrokes aimed at text entry', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    Object.defineProperty(editable, 'isContentEditable', { value: true });

    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(textarea)).toBe(true);
    expect(isTypingTarget(editable)).toBe(true);
    expect(isTypingTarget(document.createElement('button'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe('hasOpenDialog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('detects an open Radix dialog so global shortcuts can stand down', () => {
    expect(hasOpenDialog(document)).toBe(false);

    // Radix stamps its content with role + data-state; the editor's buttons are
    // focusable, so Delete inside it used to reach the global clear-queue handler.
    document.body.innerHTML = '<div role="dialog" data-state="open"></div>';
    expect(hasOpenDialog(document)).toBe(true);

    document.body.innerHTML = '<div role="dialog" data-state="closed"></div>';
    expect(hasOpenDialog(document)).toBe(false);

    document.body.innerHTML = '<div role="alertdialog" data-state="open"></div>';
    expect(hasOpenDialog(document)).toBe(true);
  });
});
