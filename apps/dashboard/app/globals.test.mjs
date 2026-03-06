import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('dashboard globals stylesheet', () => {
  it('only imports the shared tailwind stylesheet contract', () => {
    const css = readFileSync(new URL('./globals.css', import.meta.url), 'utf8');

    expect(css).toContain('@evolvo/tailwind-config/shared-styles.css');
    expect(css).not.toContain('.dashboard-shell');
    expect(css).not.toContain('body {');
  });
});
