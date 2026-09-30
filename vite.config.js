import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/Travelite/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        review: resolve(import.meta.dirname, 'review.html'),
        kyotoreview: resolve(import.meta.dirname, 'kyotoreview.html')
      }
    }
  }
});
