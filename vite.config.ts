import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // The app never talks to a server, so precaching the shell makes it fully
    // usable offline — which is also the most convincing proof of the
    // "nothing leaves your device" claim.
    VitePWA({
      registerType: 'autoUpdate',
      // favicon.svg / favicon-32.png / apple-touch-icon.png and the manifest
      // icons are already picked up by workbox.globPatterns below (they're
      // plain files in dist/ matching its svg/png extensions), so listing
      // them here too used to precache each one twice. robots.txt is the
      // only asset that genuinely needs the explicit include — .txt isn't in
      // the glob's extension list.
      includeAssets: ['robots.txt'],
      // Manifest icons are already covered by the png/svg glob below; without
      // this the plugin adds them a second time from manifest.icons.
      includeManifestIcons: false,
      workbox: {
        // 'webmanifest' is deliberately absent: vite-plugin-pwa always adds
        // manifest.webmanifest to the precache list itself, so matching it
        // here too produced a duplicate entry.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Only ever fetched by crawlers and link unfurlers — no reason to spend
        // 180 kB of the offline cache on it.
        globIgnores: ['**/og-image.png'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        // Direct navigations to these are real file requests, not app
        // routes — without a denylist an installed SW serves the app shell
        // instead of the actual robots.txt / sitemap.xml.
        navigateFallbackDenylist: [/^\/robots\.txt$/, /^\/sitemap\.xml$/],
      },
      manifest: {
        name: 'ImageCompress — Free Private Image Compressor',
        short_name: 'ImageCompress',
        description:
          'Compress JPG, PNG, WebP and AVIF images entirely in your browser. Nothing is ever uploaded.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#3B82F6',
        background_color: '#0f172a',
        categories: ['photo', 'productivity', 'utilities'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
