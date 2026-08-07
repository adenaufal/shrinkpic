import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts: the app config carries the PWA plugin
// and its manifest/workbox setup, which vitest has no use for and which
// would otherwise run (and warn) on every test invocation.
export default defineConfig({
  test: {
    environment: 'jsdom',
    // `.tsx` is included so a component/hook test is never silently skipped —
    // a test that does not run is worse than no test at all.
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
