import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import vitePluginSQLocal from 'sqlocal/vite';

export default defineConfig({
  plugins: [
    svelte(),
    vitePluginSQLocal()
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'), 
        background: resolve(__dirname, 'src/background/worker.ts'),
        offscreen: resolve(__dirname, 'offscreen.html')
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
})