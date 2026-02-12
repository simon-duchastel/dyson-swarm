import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['lib/src/**/*.{test,spec}.{js,ts}', 'cli/src/**/*.{test,spec}.{js,ts}'],
  },
});
