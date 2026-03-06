import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));

async function readJson(fileName) {
  const filePath = resolve(currentDir, fileName);
  const content = await readFile(filePath, 'utf8');

  return JSON.parse(content);
}

describe('typescript config package', () => {
  it('exports parseable shared tsconfig files', async () => {
    const baseConfig = await readJson('base.json');
    const appConfig = await readJson('app.json');
    const libraryConfig = await readJson('library.json');

    expect(baseConfig.compilerOptions.module).toBe('NodeNext');
    expect(appConfig.extends).toBe('./base.json');
    expect(libraryConfig.extends).toBe('./base.json');
  });
});
