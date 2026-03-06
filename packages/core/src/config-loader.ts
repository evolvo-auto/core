import { resolve } from 'node:path';

import { config as loadEnvFile } from 'dotenv';
import { z } from 'zod';

import { routingPolicy as defaultRoutingPolicy } from '../../../genome/routing/model-routing.js';
import {
  parseRoutingPolicy,
  type RoutingPolicyConfig
} from './model-routing-config.js';

const nonEmptyStringSchema = z.string().trim().min(1);

const baseEnvironmentSchema = z.object({
  DATABASE_URL: nonEmptyStringSchema.optional(),
  GITHUB_OWNER: nonEmptyStringSchema,
  GITHUB_REPO: nonEmptyStringSchema,
  GITHUB_TOKEN: nonEmptyStringSchema,
  OLLAMA_BASE_URL: nonEmptyStringSchema,
  OPENAI_API_KEY: nonEmptyStringSchema,
  OPENAI_BASE_URL: nonEmptyStringSchema,
  POSTGRES_DB: nonEmptyStringSchema.optional(),
  POSTGRES_HOST: nonEmptyStringSchema.optional(),
  POSTGRES_PASSWORD: nonEmptyStringSchema.optional(),
  POSTGRES_PORT: nonEmptyStringSchema.optional(),
  POSTGRES_SCHEMA: nonEmptyStringSchema.optional(),
  POSTGRES_USER: nonEmptyStringSchema.optional()
});

export type GitHubConfig = {
  owner: string;
  repo: string;
  token: string;
};

export type OpenAIConfig = {
  apiKey: string;
  baseUrl: string;
};

export type OllamaConfig = {
  baseUrl: string;
};

export type PostgresConfig = {
  database: string;
  host: string;
  password: string;
  port: number;
  schema: string;
  url: string;
  user: string;
};

export type EvolvoConfig = {
  github: GitHubConfig;
  ollama: OllamaConfig;
  openai: OpenAIConfig;
  postgres: PostgresConfig;
  routing: RoutingPolicyConfig;
};

export type LoadConfigOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  envFilePath?: string;
  routingPolicy?: unknown;
};

function buildPostgresUrl(
  input: Omit<PostgresConfig, 'url' | 'port'> & { port: string | number }
): string {
  const params = new URLSearchParams({
    schema: input.schema
  });

  return `postgresql://${encodeURIComponent(input.user)}:${encodeURIComponent(input.password)}@${input.host}:${String(input.port)}/${input.database}?${params.toString()}`;
}

function parseDatabaseUrl(databaseUrl: string): PostgresConfig {
  const parsedUrl = new URL(databaseUrl);
  const database = parsedUrl.pathname.replace(/^\//, '').trim();
  const host = parsedUrl.hostname.trim();
  const password = decodeURIComponent(parsedUrl.password).trim();
  const schema = parsedUrl.searchParams.get('schema')?.trim();
  const user = decodeURIComponent(parsedUrl.username).trim();

  if (database.length === 0) {
    throw new Error('DATABASE_URL must include a database name');
  }

  if (host.length === 0) {
    throw new Error('DATABASE_URL must include a host');
  }

  if (user.length === 0) {
    throw new Error('DATABASE_URL must include a username');
  }

  if (password.length === 0) {
    throw new Error('DATABASE_URL must include a password');
  }

  if (!schema) {
    throw new Error('DATABASE_URL must include a schema query parameter');
  }

  const port = Number(parsedUrl.port || '5432');

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('DATABASE_URL must include a valid port');
  }

  return {
    database,
    host,
    password,
    port,
    schema,
    url: databaseUrl,
    user
  };
}

function buildPostgresConfig(
  environment: z.infer<typeof baseEnvironmentSchema>
): PostgresConfig {
  if (environment.DATABASE_URL) {
    return parseDatabaseUrl(environment.DATABASE_URL);
  }

  const requiredComponentKeys = [
    'POSTGRES_DB',
    'POSTGRES_HOST',
    'POSTGRES_PASSWORD',
    'POSTGRES_PORT',
    'POSTGRES_SCHEMA',
    'POSTGRES_USER'
  ] as const;

  const missingKeys = requiredComponentKeys.filter(
    (key) => environment[key] === undefined
  );

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required Postgres environment variables: ${missingKeys.join(', ')}`
    );
  }

  const port = Number(environment.POSTGRES_PORT);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('POSTGRES_PORT must be a positive integer');
  }

  const postgresConfig: PostgresConfig = {
    database: environment.POSTGRES_DB!,
    host: environment.POSTGRES_HOST!,
    password: environment.POSTGRES_PASSWORD!,
    port,
    schema: environment.POSTGRES_SCHEMA!,
    url: '',
    user: environment.POSTGRES_USER!
  };

  return {
    ...postgresConfig,
    url: buildPostgresUrl(postgresConfig)
  };
}

export function buildConfig(
  env: NodeJS.ProcessEnv = process.env,
  routingPolicy: unknown = defaultRoutingPolicy
): EvolvoConfig {
  const environment = baseEnvironmentSchema.parse(env);

  return {
    github: {
      owner: environment.GITHUB_OWNER,
      repo: environment.GITHUB_REPO,
      token: environment.GITHUB_TOKEN
    },
    ollama: {
      baseUrl: environment.OLLAMA_BASE_URL
    },
    openai: {
      apiKey: environment.OPENAI_API_KEY,
      baseUrl: environment.OPENAI_BASE_URL
    },
    postgres: buildPostgresConfig(environment),
    routing: parseRoutingPolicy(routingPolicy)
  };
}

export function loadConfig(options: LoadConfigOptions = {}): EvolvoConfig {
  const env = options.env ?? process.env;

  loadEnvFile({
    path: options.envFilePath ?? resolve(options.cwd ?? process.cwd(), '.env'),
    processEnv: env,
    quiet: true
  });

  return buildConfig(env, options.routingPolicy);
}
