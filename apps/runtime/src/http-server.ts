import type { RuntimeLoopStatus } from '@evolvo/execution/runtime-loop';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse
} from 'node:http';

import { buildRuntimeHealth } from './health-contract.js';

export type RuntimeStatusProvider = () => RuntimeLoopStatus | undefined;

export function createRuntimeHandler(
  startedAt = new Date(),
  getLoopStatus?: RuntimeStatusProvider
) {
  return function runtimeHandler(
    request: IncomingMessage,
    response: ServerResponse
  ) {
    const method = request.method ?? 'GET';
    const url = request.url ?? '/';

    if (method === 'GET' && url === '/health') {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8'
      });
      response.end(
        JSON.stringify(
          buildRuntimeHealth({
            loopStatus: getLoopStatus?.(),
            startedAt
          })
        )
      );
      return;
    }

    if (method === 'GET' && url === '/') {
      response.writeHead(200, {
        'content-type': 'text/plain; charset=utf-8'
      });
      response.end('Evolvo runtime is online.');
      return;
    }

    response.writeHead(404, {
      'content-type': 'application/json; charset=utf-8'
    });
    response.end(JSON.stringify({ message: 'Not found' }));
  };
}

export function createRuntimeServer(
  startedAt = new Date(),
  getLoopStatus?: RuntimeStatusProvider
) {
  return createServer(createRuntimeHandler(startedAt, getLoopStatus));
}
