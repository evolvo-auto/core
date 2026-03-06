import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { GET } from './route';

describe('GET /api/health', () => {
  it('returns the dashboard health contract', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      service: 'dashboard',
      status: 'healthy'
    });
  });
});
