export type DatabaseUrlInput = {
  database?: string;
  host?: string;
  password?: string;
  port?: number | string;
  schema?: string;
  url?: string;
  user?: string;
};

const DEFAULT_DATABASE = 'evolvo';
const DEFAULT_HOST = 'localhost';
const DEFAULT_PASSWORD = 'evolvo';
const DEFAULT_PORT = '5432';
const DEFAULT_SCHEMA = 'public';
const DEFAULT_USER = 'evolvo';

export function buildDatabaseUrl(input: DatabaseUrlInput = {}): string {
  if (input.url?.trim()) {
    return input.url.trim();
  }

  const database = input.database ?? DEFAULT_DATABASE;
  const host = input.host ?? DEFAULT_HOST;
  const password = input.password ?? DEFAULT_PASSWORD;
  const port = String(input.port ?? DEFAULT_PORT);
  const schema = input.schema ?? DEFAULT_SCHEMA;
  const user = input.user ?? DEFAULT_USER;
  const params = new URLSearchParams({ schema });

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?${params.toString()}`;
}

export function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return buildDatabaseUrl({
    database: env.POSTGRES_DB,
    host: env.POSTGRES_HOST,
    password: env.POSTGRES_PASSWORD,
    port: env.POSTGRES_PORT,
    schema: env.POSTGRES_SCHEMA,
    url: env.DATABASE_URL,
    user: env.POSTGRES_USER
  });
}
