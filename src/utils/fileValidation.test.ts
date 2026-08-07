import { describe, expect, it } from 'vitest';
import { MAX_FILES, MAX_FILE_BYTES, validateFiles } from './fileValidation';

const makeFile = (name: string, type: string, size = 1024): File => {
  const file = new File([new Uint8Array(size)], name, { type });
  return file;
};

describe('validateFiles', () => {
  it('accepts a normal batch of supported images', () => {
    const files = [makeFile('a.jpg', 'image/jpeg'), makeFile('b.png', 'image/png')];
    const { accepted, errors } = validateFiles(files);
    expect(accepted).toHaveLength(2);
    expect(errors).toHaveLength(0);
  });

  it('rejects HEIC files with a specific, actionable message', () => {
    const files = [makeFile('IMG_1234.HEIC', '')];
    const { accepted, errors } = validateFiles(files);
    expect(accepted).toHaveLength(0);
    expect(errors[0]).toMatch(/HEIC/);
  });

  it('rejects unsupported mime types (e.g. a PDF renamed or picked via "All Files")', () => {
    const files = [makeFile('document.pdf', 'application/pdf')];
    const { accepted, errors } = validateFiles(files);
    expect(accepted).toHaveLength(0);
    expect(errors[0]).toMatch(/JPG|not supported|skipped/i);
  });

  it('rejects files over the per-file size cap', () => {
    const files = [makeFile('huge.jpg', 'image/jpeg', MAX_FILE_BYTES + 1)];
    const { accepted, errors } = validateFiles(files);
    expect(accepted).toHaveLength(0);
    expect(errors[0]).toMatch(/limit/i);
  });

  it('stops accepting once the queue would exceed MAX_FILES, counting what is already queued', () => {
    const files = Array.from({ length: 5 }, (_, i) => makeFile(`f${i}.jpg`, 'image/jpeg'));
    const { accepted, errors } = validateFiles(files, MAX_FILES - 2);
    expect(accepted).toHaveLength(2);
    expect(errors.some((message) => /queue holds/.test(message))).toBe(true);
  });

  it('never partially drops a batch silently — every rejection is reported', () => {
    const files = [
      makeFile('ok.jpg', 'image/jpeg'),
      makeFile('bad.pdf', 'application/pdf'),
      makeFile('also-ok.png', 'image/png'),
    ];
    const { accepted, errors } = validateFiles(files);
    expect(accepted).toHaveLength(2);
    expect(errors).toHaveLength(1);
  });
});
