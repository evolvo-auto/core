import { afterEach, describe, expect, it } from 'vitest';

import { createRuntimeServer } from './http-server.js';

const serversToClose: Array<ReturnType<typeof createRuntimeServer>> = [];

async function withRuntimeServer() {
  const server = createRuntimeServer(new Date('2026-03-06T12:00:00.000Z'));
  serversToClose.push(server);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Runtime test server did not expose a TCP port');
  }

  return {
    baseUrl: `http://127.0.0.1:${String(address.port)}`,
    server
  };
}

afterEach(async () => {
  await Promise.all(
    serversToClose.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        })
    )
  );
});

describe('createRuntimeServer', () => {
  it('serves a typed health response', async () => {
    const { baseUrl } = await withRuntimeServer();
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      checks: expect.any(Array),
      service: 'runtime',
      status: 'healthy'
    });
  });

  it('returns 404 for unknown routes', async () => {
    const { baseUrl } = await withRuntimeServer();
    const response = await fetch(`${baseUrl}/missing`);

    expect(response.status).toBe(404);
  });
});
