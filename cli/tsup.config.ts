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
  // Bundle all dependencies including JSR packages
  noExternal: ['@cliffy/ansi', '@cliffy/command', '@cliffy/flags', '@cliffy/table'],
  // Keep dyson-swarm as external since it's a local workspace package
  external: ['dyson-swarm'],
});
