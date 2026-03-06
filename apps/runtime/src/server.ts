import { resolve } from 'node:path';

import { config as loadEnvFile } from 'dotenv';
import { createRuntimeLoop } from '@evolvo/execution/runtime-loop';

import { createRuntimeServer } from './http-server.js';
import {
  getRuntimeServerConfig,
  getRuntimeWorkerConfig
} from './server-config.js';

loadEnvFile({
  path: resolve(process.cwd(), '../../.env'),
  processEnv: process.env,
  quiet: true
});

const { host, port } = getRuntimeServerConfig();
const workerConfig = getRuntimeWorkerConfig();
const runtimeLoop = createRuntimeLoop({
  baseRef: workerConfig.baseRef,
  gitRemote: workerConfig.gitRemote,
  intervalMs: workerConfig.loopIntervalMs,
  maxRepairAttempts: workerConfig.maxRepairAttempts,
  smokeContract:
    workerConfig.smokeBaseUrl || workerConfig.smokeUsePlaywright
      ? {
          baseUrl:
            workerConfig.smokeBaseUrl ??
            `http://127.0.0.1:${process.env.DASHBOARD_PORT?.trim() || '3000'}`,
          usePlaywright: workerConfig.smokeUsePlaywright
        }
      : undefined,
  worktreesRoot: workerConfig.worktreesRoot
});
const server = createRuntimeServer(new Date(), () => runtimeLoop.getStatus());

server.listen(port, host, () => {
  runtimeLoop.start();
  process.stdout.write(
    `@evolvo/runtime listening on http://${host}:${String(port)}\n`
  );
});

function shutdown() {
  void runtimeLoop.stop().finally(() => {
    server.close(() => {
      process.exit(0);
    });
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
