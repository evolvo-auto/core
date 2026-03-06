import { describe, expect, it } from 'vitest';

import config from './base.mjs';

describe('eslint config package', () => {
  it('exports a non-empty flat config', () => {
    expect(Array.isArray(config)).toBe(true);
    expect(config.length).toBeGreaterThan(0);
  });
});
