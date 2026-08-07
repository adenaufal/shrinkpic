import { describe, expect, it } from 'vitest';
import { createId, formatFileSize } from './format';

describe('formatFileSize', () => {
  it('formats zero and invalid input as "0 Bytes" instead of NaN/"undefined"', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(-5)).toBe('0 Bytes');
    expect(formatFileSize(NaN)).toBe('0 Bytes');
  });

  it('picks the right unit and rounds to two decimal places', () => {
    expect(formatFileSize(500)).toBe('500 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
  });

  it('never indexes past the known units for values below 1 byte', () => {
    // log(0.5)/log(1024) is negative — the old implementation had no floor,
    // so this produced `sizes[-1]` -> "undefined".
    expect(formatFileSize(0.5)).not.toContain('undefined');
  });

  it('clamps to the largest known unit for absurdly large inputs', () => {
    const huge = 1024 ** 6; // one exabyte's worth of bytes
    expect(formatFileSize(huge)).not.toContain('undefined');
    expect(formatFileSize(huge)).toMatch(/TB$/);
  });
});

describe('createId', () => {
  it('produces non-empty, distinct ids', () => {
    const a = createId();
    const b = createId();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });
});
