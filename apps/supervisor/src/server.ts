import { resolve } from 'node:path';

import { config as loadEnvFile } from 'dotenv';

import { createSupervisorServer } from './http-server.js';
import { getSupervisorServerConfig } from './server-config.js';

loadEnvFile({
  path: resolve(process.cwd(), '../../.env'),
  processEnv: process.env,
  quiet: true
});

const { host, port } = getSupervisorServerConfig();
const server = createSupervisorServer(new Date());

server.listen(port, host, () => {
  process.stdout.write(
    `@evolvo/supervisor listening on http://${host}:${String(port)}\n`
  );
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
