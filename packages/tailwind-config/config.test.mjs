import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { postcssConfig } from './postcss.config.mjs';

describe('tailwind config package', () => {
  it('exports the shared postcss plugin contract', () => {
    expect(postcssConfig).toEqual({
      plugins: {
        '@tailwindcss/postcss': {}
      }
    });
  });

  it('defines shared theme tokens without authored selector rules', () => {
    const css = readFileSync(
      new URL('./shared-styles.css', import.meta.url),
      'utf8'
    );

    expect(css).toContain('tailwindcss');
    expect(css).toContain('@theme {');
    expect(css).not.toContain('body {');
    expect(css).not.toContain('.dashboard-shell');
  });
});
