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

async function readEnvExample() {
  const filePath = resolve(process.cwd(), '.env.example');
  const content = await readFile(filePath, 'utf8');

  return Object.fromEntries(
    content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => {
        const separatorIndex = line.indexOf('=');

        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      })
  );
}

describe('local services compose config', () => {
  it('defines the expected Postgres and Adminer services', async () => {
    const config = await readComposeFile();
    const envExample = await readEnvExample();

    expect(config.services.postgres.image).toBe('postgres:17-alpine');
    expect(config.services.postgres.environment.POSTGRES_DB).toBe(
      '${POSTGRES_DB:-evolvo}'
    );
    expect(config.services.postgres.environment.POSTGRES_USER).toBe(
      '${POSTGRES_USER:-evolvo}'
    );
    expect(config.services.postgres.environment.POSTGRES_PASSWORD).toBe(
      '${POSTGRES_PASSWORD:-evolvo}'
    );
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

    expect(envExample.POSTGRES_DB).toBe('evolvo');
    expect(envExample.POSTGRES_USER).toBe('evolvo');
    expect(envExample.POSTGRES_PASSWORD).toBe('evolvo');
    expect(envExample.POSTGRES_PORT).toBe('5432');
    expect(envExample.ADMINER_PORT).toBe('8080');
  });
});
