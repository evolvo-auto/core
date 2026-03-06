import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov']
    },
    environment: 'node',
    globals: false,
    include: ['**/*.test.{js,mjs,cjs,ts,mts,cts,tsx,mtsx,ctsx}'],
    passWithNoTests: true
  }
});
