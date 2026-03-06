import { afterEach, describe, expect, it } from 'vitest';

import { createSupervisorServer } from './http-server.js';

const serversToClose: Array<ReturnType<typeof createSupervisorServer>> = [];

async function withSupervisorServer() {
  const server = createSupervisorServer(new Date('2026-03-06T12:00:00.000Z'));
  serversToClose.push(server);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Supervisor test server did not expose a TCP port');
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

describe('createSupervisorServer', () => {
  it('serves a typed health response', async () => {
    const { baseUrl } = await withSupervisorServer();
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      checks: expect.any(Array),
      service: 'supervisor',
      status: 'healthy'
    });
  });

  it('returns 404 for unknown routes', async () => {
    const { baseUrl } = await withSupervisorServer();
    const response = await fetch(`${baseUrl}/missing`);

    expect(response.status).toBe(404);
  });
});
