import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'node:path';
import { createJevProxyHandler } from './local-proxy';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'jev-local-proxy',
      configureServer(server) {
        server.middlewares.use('/api/jev/evaluate', createJevProxyHandler());
      },
      configurePreviewServer(server) {
        server.middlewares.use('/api/jev/evaluate', createJevProxyHandler());
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          tanstack: ['@tanstack/react-query', '@tanstack/react-router'],
          icons: ['lucide-react'],
          structuredData: ['yaml', 'smol-toml'],
          markdown: ['marked', 'dompurify'],
          sqlFormatter: ['sql-formatter'],
          userAgent: ['bowser'],
        },
      },
    },
  },
  server: { proxy: { '/api': 'http://127.0.0.1:8080' } },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
