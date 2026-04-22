import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['Sci-Daily_online.png'],
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
              src: '/Sci-Daily_online.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/Sci-Daily_online.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/Sci-Daily_online.png',
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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
