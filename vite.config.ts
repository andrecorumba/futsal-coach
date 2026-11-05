import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app under /<repo>/; the deploy workflow sets VITE_BASE.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'prompt',
      // Registered from main.ts through virtual:pwa-register (design.md D11).
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Futsal Coach',
        short_name: 'Futsal',
        description: 'Prancheta de futsal: escalação, substituições, cronômetro e tempo em quadra.',
        lang: 'pt-BR',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        theme_color: '#1b1f24',
        background_color: '#1b1f24',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
