import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'Sci-Daily_online.png'],
        manifest: {
          name: '科研Daily',
          short_name: '科研Daily',
          description: '研究与生活记录应用',
          theme_color: '#4A665A',
          background_color: '#FAF8F6',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'Sci-Daily_online.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'Sci-Daily_online.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'Sci-Daily_online.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
