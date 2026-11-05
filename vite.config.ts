import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base makes the build portable to GitHub Pages project sites.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      disable: mode === 'test',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'apple-touch-icon-180x180.png',
        'pwa-64x64.png',
      ],
      manifest: {
        name: 'SmartPlanner',
        short_name: 'SmartPlanner',
        description:
          'Notti in stanza, presenza in ufficio e smart working per due colleghi.',
        lang: 'it',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: './',
        start_url: './',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Personal data must never be cached by the service worker:
            // the app already keeps a local snapshot in localStorage.
            urlPattern: /^https:\/\/[^/]+\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}))
