import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.ANTISPIRAL_API_TARGET || 'http://127.0.0.1:8000',
        // Keep Host aligned with the browser's Origin, including Vite's actual port.
        // The API can then verify same-origin requests without allowing extra origins.
        changeOrigin: false,
      },
    },
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
