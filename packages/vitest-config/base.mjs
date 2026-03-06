import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov']
    },
    environment: 'node',
    exclude: [...configDefaults.exclude, '**/.worktrees/**'],
    globals: false,
    include: [
      '*.test.{js,mjs,cjs,ts,mts,cts,tsx,mtsx,ctsx}',
      'src/**/*.test.{js,mjs,cjs,ts,mts,cts,tsx,mtsx,ctsx}',
      'app/**/*.test.{js,mjs,cjs,ts,mts,cts,tsx,mtsx,ctsx}',
      'infra/**/*.test.{js,mjs,cjs,ts,mts,cts,tsx,mtsx,ctsx}'
    ],
    passWithNoTests: true
  }
});
