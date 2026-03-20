import path from 'path';
import { fileURLToPath } from 'url';

import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import autoprefixer from 'autoprefixer';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: [tailwindcss(), vue()],
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
      frontend: path.resolve(dirname, '.'),
      core: path.resolve(dirname, '../core'),
      backend: path.resolve(dirname, '../backend'),
      src: path.resolve(dirname, 'src'),
      data: path.resolve(dirname, '../data'),
      '~': path.resolve(dirname, '../core'),
    },
  },
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
  },
};
