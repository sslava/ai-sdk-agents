import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['node_modules', 'dist', 'build', 'examples'],
    globals: true,
    environment: 'node',
  },
});
