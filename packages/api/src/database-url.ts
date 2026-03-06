export type DatabaseUrlInput = {
  database?: string;
  host?: string;
  password?: string;
  port?: number | string;
  schema?: string;
  url?: string;
  user?: string;
};

const REQUIRED_COMPONENTS = [
  ['database', 'POSTGRES_DB'],
  ['host', 'POSTGRES_HOST'],
  ['password', 'POSTGRES_PASSWORD'],
  ['port', 'POSTGRES_PORT'],
  ['schema', 'POSTGRES_SCHEMA'],
  ['user', 'POSTGRES_USER']
] as const;

export function buildDatabaseUrl(input: DatabaseUrlInput = {}): string {
  if (input.url?.trim()) {
    return input.url.trim();
  }

  const missingVariables = REQUIRED_COMPONENTS.flatMap(([field, envVar]) => {
    const value = input[field];
    return typeof value === 'string' && value.trim().length > 0
      ? []
      : value !== undefined && value !== null && String(value).trim().length > 0
        ? []
        : [envVar];
  });

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missingVariables.join(', ')}`
    );
  }

  const database = input.database!.trim();
  const host = input.host!.trim();
  const password = input.password!.trim();
  const port = String(input.port).trim();
  const schema = input.schema!.trim();
  const user = input.user!.trim();
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
