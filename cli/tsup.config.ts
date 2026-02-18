import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  platform: 'node',
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  // Bundle all JSR packages, cliffy-flat-help, and @cliffy/prompt
  noExternal: [/@jsr\/.*/, 'cliffy-flat-help', '@cliffy/prompt'],
  // Keep dyson-swarm as external since it's a local workspace package
  external: ['dyson-swarm'],
});
