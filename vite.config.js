import { defineConfig } from 'vite'

export default defineConfig({
  clearScreen: false,
  base: './',
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    target: 'chrome120',
    minify: 'esbuild',
  },
})
