import { describe, expect, it } from 'vitest';

import { buildDatabaseUrl, getDatabaseUrl } from './database-url.js';

describe('database URL helpers', () => {
  it('prefers DATABASE_URL when it is present', () => {
    expect(
      getDatabaseUrl({
        DATABASE_URL: 'postgresql://override:secret@db.example.com:5432/evolvo'
      })
    ).toBe('postgresql://override:secret@db.example.com:5432/evolvo');
  });

  it('builds a URL from Postgres component env values', () => {
    expect(
      getDatabaseUrl({
        POSTGRES_DB: 'runtime',
        POSTGRES_HOST: 'db.internal',
        POSTGRES_PASSWORD: 'p@ss word',
        POSTGRES_PORT: '5433',
        POSTGRES_SCHEMA: 'internal',
        POSTGRES_USER: 'service-user'
      })
    ).toBe(
      'postgresql://service-user:p%40ss%20word@db.internal:5433/runtime?schema=internal'
    );
  });

  it('fails when required Postgres component env values are missing', () => {
    expect(() =>
      buildDatabaseUrl({
        database: 'runtime',
        host: 'db.internal'
      })
    ).toThrowError(
      'Missing required database environment variables: POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_SCHEMA, POSTGRES_USER'
    );
  });
});
