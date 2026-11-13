import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  server: { watch: { usePolling: true, interval: 500 } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'rentease-mark.svg'],
      manifest: {
        name: 'RentEase',
        short_name: 'RentEase',
        description: 'Tenant & Owner Portal for Rent and Electricity Billing',
        theme_color: '#153F35',
        background_color: '#F9F8F5',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: '/rentease-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/rentease-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/rentease-icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
