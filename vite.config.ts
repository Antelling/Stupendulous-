import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Stupendulous-/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
});
