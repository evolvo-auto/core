import { resolve } from 'node:path';

import { config as loadEnvFile } from 'dotenv';

import { createRuntimeServer } from './http-server.js';
import { getRuntimeServerConfig } from './server-config.js';

loadEnvFile({
  path: resolve(process.cwd(), '../../.env'),
  processEnv: process.env,
  quiet: true
});

const { host, port } = getRuntimeServerConfig();
const server = createRuntimeServer(new Date());

server.listen(port, host, () => {
  process.stdout.write(
    `@evolvo/runtime listening on http://${host}:${String(port)}\n`
  );
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
