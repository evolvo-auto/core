import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

async function readComposeFile() {
  const filePath = resolve(
    process.cwd(),
    'infra/compose/local-services.compose.yaml'
  );
  const content = await readFile(filePath, 'utf8');

  return parse(content);
}

describe('local services compose config', () => {
  it('defines the expected Postgres and Adminer services', async () => {
    const config = await readComposeFile();

    expect(config.services.postgres.image).toBe('postgres:17-alpine');
    expect(config.services.postgres.ports).toContain(
      '${POSTGRES_PORT:-5432}:5432'
    );
    expect(config.services.postgres.healthcheck.test).toEqual([
      'CMD-SHELL',
      'pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB'
    ]);

    expect(config.services.adminer.image).toBe('adminer:5');
    expect(config.services.adminer.depends_on.postgres.condition).toBe(
      'service_healthy'
    );

    expect(config.volumes['evolvo-postgres-data'].name).toBe(
      'evolvo-postgres-data'
    );
    expect(config.networks['evolvo-local'].name).toBe('evolvo-local');
  });
});
