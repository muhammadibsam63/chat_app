import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const apiProxy = {
  '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
  '/uploads': { target: 'http://127.0.0.1:3000', changeOrigin: true },
  '/socket.io': { target: 'http://127.0.0.1:3000', ws: true, changeOrigin: true },
};

export default defineConfig({
  root: 'client',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./client/src', import.meta.url)) },
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: { port: 5173, strictPort: true, proxy: apiProxy },
  preview: { port: 4173, proxy: apiProxy },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
} as never);
