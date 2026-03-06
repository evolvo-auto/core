export type SupervisorServerConfig = {
  host: string;
  port: number;
};

export function getSupervisorServerConfig(
  env: NodeJS.ProcessEnv = process.env
): SupervisorServerConfig {
  const portValue = env.SUPERVISOR_PORT?.trim();

  if (!portValue) {
    throw new Error('SUPERVISOR_PORT is required');
  }

  const port = Number(portValue);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('SUPERVISOR_PORT must be a positive integer');
  }

  return {
    host: env.SUPERVISOR_HOST?.trim() || '127.0.0.1',
    port
  };
}
