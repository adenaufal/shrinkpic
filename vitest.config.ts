import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts: the app config carries the PWA plugin
// and its manifest/workbox setup, which vitest has no use for and which
// would otherwise run (and warn) on every test invocation.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
