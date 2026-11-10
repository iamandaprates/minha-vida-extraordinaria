import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'logo.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Mive · Minha Vida Extraordinária',
        short_name: 'Mive',
        description: 'Centro de execução da sua vida extraordinária: planeje, foque e evolua.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#F31991',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], navigateFallback: '/index.html' }
    })
  ]
});
