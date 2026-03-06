export type RuntimeServerConfig = {
  host: string;
  port: number;
};

export function getRuntimeServerConfig(
  env: NodeJS.ProcessEnv = process.env
): RuntimeServerConfig {
  const portValue = env.RUNTIME_PORT?.trim();

  if (!portValue) {
    throw new Error('RUNTIME_PORT is required');
  }

  const port = Number(portValue);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('RUNTIME_PORT must be a positive integer');
  }

  return {
    host: env.RUNTIME_HOST?.trim() || '127.0.0.1',
    port
  };
}
