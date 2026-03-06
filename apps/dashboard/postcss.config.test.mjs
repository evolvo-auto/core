import { describe, expect, it } from 'vitest';

import postcssConfig from './postcss.config.mjs';

describe('dashboard postcss config', () => {
  it('uses the shared tailwind postcss plugin contract', () => {
    expect(postcssConfig).toEqual({
      plugins: {
        '@tailwindcss/postcss': {}
      }
    });
  });
});
