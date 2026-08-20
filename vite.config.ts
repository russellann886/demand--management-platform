import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(rootDir, 'client'),
  publicDir: false,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'client/src'),
      '@client': path.resolve(rootDir, 'client'),
      '@shared': path.resolve(rootDir, 'shared'),
    },
  },
  build: {
    outDir: path.resolve(rootDir, 'dist/client'),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
