import {
  createServer,
  type IncomingMessage,
  type ServerResponse
} from 'node:http';

import { buildSupervisorHealth } from './health-contract.js';

export function createSupervisorHandler(startedAt = new Date()) {
  return function supervisorHandler(
    request: IncomingMessage,
    response: ServerResponse
  ) {
    const method = request.method ?? 'GET';
    const url = request.url ?? '/';

    if (method === 'GET' && url === '/health') {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8'
      });
      response.end(JSON.stringify(buildSupervisorHealth({ startedAt })));
      return;
    }

    if (method === 'GET' && url === '/') {
      response.writeHead(200, {
        'content-type': 'text/plain; charset=utf-8'
      });
      response.end('Evolvo supervisor is online.');
      return;
    }

    response.writeHead(404, {
      'content-type': 'application/json; charset=utf-8'
    });
    response.end(JSON.stringify({ message: 'Not found' }));
  };
}

export function createSupervisorServer(startedAt = new Date()) {
  return createServer(createSupervisorHandler(startedAt));
}
