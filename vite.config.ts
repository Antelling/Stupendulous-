import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Stupendulous-/',
  build: {
    outDir: 'docs',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
});
