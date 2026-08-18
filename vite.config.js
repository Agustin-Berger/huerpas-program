import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: [
        'favicon.svg',
        'icons.svg',
      ],

      manifest: {
        name: 'Huerpas Program',
        short_name: 'Huerpas',
        description:
          'Aplicación de toma y gestión de pedidos de Huerpas Distribuidora.',

        theme_color: '#2f6b43',
        background_color: '#f8faf8',

        display: 'standalone',

        start_url: '/',
        scope: '/',

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },

      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg}',
        ],
      },
    }),
  ],
})