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
  // Bundle all JSR packages and cliffy-flat-help (since it contains JSR dependencies)
  noExternal: [/@jsr\/.*/, 'cliffy-flat-help'],
  // Keep dyson-swarm as external since it's a local workspace package
  external: ['dyson-swarm'],
});
