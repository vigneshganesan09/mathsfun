import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages serves the app from /mathsfun/; the deploy workflow sets BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    // Installable, works offline (spec §2, milestone 10).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'logo.webp'],
      manifest: {
        name: 'Duddu Learn',
        short_name: 'Duddu Learn',
        description: 'Speels rekenen en lezen voor groep 1–8, in het Nederlands en Engels.',
        lang: 'nl',
        theme_color: '#fff8ec',
        background_color: '#fff8ec',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Book covers are precached; the pages are cached the first time a book is opened.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png}', 'books/*/cover.jpg'],
        // The pdf.js worker (PDF picture books) is ~1.4 MB.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            // Online book pages: show the cached copy, refresh in the background.
            urlPattern: ({ url }) => url.origin === 'https://global-asp.github.io',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'online-books', expiration: { maxEntries: 120 } },
          },
          {
            // Pictures of the books bundled with the app.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && (url.pathname.includes('/books/') || url.pathname.includes('/pdfs/')),
            handler: 'CacheFirst',
            options: { cacheName: 'bundled-books', expiration: { maxEntries: 400 } },
          },
          {
            // Book illustrations: keep them once downloaded.
            urlPattern: ({ url }) => url.origin === 'https://raw.githubusercontent.com',
            handler: 'CacheFirst',
            options: { cacheName: 'book-images', expiration: { maxEntries: 600 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
});
