import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { routingPolicy } from '../../../genome/routing/model-routing.js';
import { buildConfig, loadConfig } from './config-loader.js';

describe('config loader', () => {
  it('builds config from explicit Postgres component env values', () => {
    const config = buildConfig(
      {
        GITHUB_OWNER: 'evolvo-auto',
        GITHUB_REPO: 'core',
        GITHUB_TOKEN: 'github-token',
        OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
        OPENAI_API_KEY: 'openai-key',
        OPENAI_BASE_URL: 'https://api.openai.com/v1',
        POSTGRES_DB: 'evolvo',
        POSTGRES_HOST: 'localhost',
        POSTGRES_PASSWORD: 'evolvo',
        POSTGRES_PORT: '5432',
        POSTGRES_SCHEMA: 'public',
        POSTGRES_USER: 'evolvo'
      },
      routingPolicy
    );

    expect(config).toEqual({
      github: {
        owner: 'evolvo-auto',
        repo: 'core',
        token: 'github-token'
      },
      ollama: {
        baseUrl: 'http://127.0.0.1:11434'
      },
      openai: {
        apiKey: 'openai-key',
        baseUrl: 'https://api.openai.com/v1'
      },
      postgres: {
        database: 'evolvo',
        host: 'localhost',
        password: 'evolvo',
        port: 5432,
        schema: 'public',
        url: 'postgresql://evolvo:evolvo@localhost:5432/evolvo?schema=public',
        user: 'evolvo'
      },
      routing: routingPolicy
    });
  });

  it('builds config from DATABASE_URL when it is present', () => {
    const config = buildConfig(
      {
        DATABASE_URL:
          'postgresql://service-user:p%40ss%20word@db.internal:6432/runtime?schema=internal',
        GITHUB_OWNER: 'evolvo-auto',
        GITHUB_REPO: 'core',
        GITHUB_TOKEN: 'github-token',
        OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
        OPENAI_API_KEY: 'openai-key',
        OPENAI_BASE_URL: 'https://api.openai.com/v1'
      },
      routingPolicy
    );

    expect(config.postgres).toEqual({
      database: 'runtime',
      host: 'db.internal',
      password: 'p@ss word',
      port: 6432,
      schema: 'internal',
      url: 'postgresql://service-user:p%40ss%20word@db.internal:6432/runtime?schema=internal',
      user: 'service-user'
    });
  });

  it('rejects incomplete Postgres component env values', () => {
    expect(() =>
      buildConfig(
        {
          GITHUB_OWNER: 'evolvo-auto',
          GITHUB_REPO: 'core',
          GITHUB_TOKEN: 'github-token',
          OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
          OPENAI_API_KEY: 'openai-key',
          OPENAI_BASE_URL: 'https://api.openai.com/v1',
          POSTGRES_DB: 'evolvo'
        },
        routingPolicy
      )
    ).toThrowError(
      'Missing required Postgres environment variables: POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_SCHEMA, POSTGRES_USER'
    );
  });

  it('rejects DATABASE_URL values without an explicit schema parameter', () => {
    expect(() =>
      buildConfig(
        {
          DATABASE_URL:
            'postgresql://service-user:secret@db.internal:6432/runtime',
          GITHUB_OWNER: 'evolvo-auto',
          GITHUB_REPO: 'core',
          GITHUB_TOKEN: 'github-token',
          OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
          OPENAI_API_KEY: 'openai-key',
          OPENAI_BASE_URL: 'https://api.openai.com/v1'
        },
        routingPolicy
      )
    ).toThrowError('DATABASE_URL must include a schema query parameter');
  });

  it('loads config values from a root env file', async () => {
    const tempDirectory = await mkdtemp(
      join(tmpdir(), 'evolvo-config-loader-')
    );
    const envFilePath = join(tempDirectory, '.env');

    await writeFile(
      envFilePath,
      [
        'GITHUB_OWNER=evolvo-auto',
        'GITHUB_REPO=core',
        'GITHUB_TOKEN=github-token',
        'OPENAI_API_KEY=openai-key',
        'OPENAI_BASE_URL=https://api.openai.com/v1',
        'OLLAMA_BASE_URL=http://127.0.0.1:11434',
        'POSTGRES_DB=evolvo',
        'POSTGRES_HOST=localhost',
        'POSTGRES_PASSWORD=evolvo',
        'POSTGRES_PORT=5432',
        'POSTGRES_SCHEMA=public',
        'POSTGRES_USER=evolvo'
      ].join('\n')
    );

    const config = loadConfig({
      env: {},
      envFilePath,
      routingPolicy
    });

    expect(config.github.repo).toBe('core');
    expect(config.postgres.url).toBe(
      'postgresql://evolvo:evolvo@localhost:5432/evolvo?schema=public'
    );
  });
});
