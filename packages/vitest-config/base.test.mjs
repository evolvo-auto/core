import { describe, expect, it } from 'vitest';

import config from './base.mjs';

describe('vitest config package', () => {
  it('exports a node-focused config with passWithNoTests enabled', () => {
    expect(config.test.environment).toBe('node');
    expect(config.test.passWithNoTests).toBe(true);
  });
});
