import { describe, expect, it } from 'vitest';

import config from './base.mjs';

describe('vitest config package', () => {
  it('exports a node-focused config with runtime worktree paths excluded', () => {
    expect(config.test.environment).toBe('node');
    expect(config.test.exclude).toContain('**/.worktrees/**');
    expect(config.test.exclude).toContain('**/node_modules/**');
    expect(config.test.include).toEqual([
      '*.test.{js,mjs,cjs,ts,mts,cts,tsx,mtsx,ctsx}',
      'src/**/*.test.{js,mjs,cjs,ts,mts,cts,tsx,mtsx,ctsx}',
      'app/**/*.test.{js,mjs,cjs,ts,mts,cts,tsx,mtsx,ctsx}',
      'infra/**/*.test.{js,mjs,cjs,ts,mts,cts,tsx,mtsx,ctsx}'
    ]);
    expect(config.test.passWithNoTests).toBe(true);
  });
});
