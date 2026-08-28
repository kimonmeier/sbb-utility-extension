import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
      $lib: resolve(import.meta.dirname, 'src/lib'),
      $background: resolve(import.meta.dirname, 'src/background')
    }
  },
  test: {
    include: ['src/**/*.test.ts']
  }
});
