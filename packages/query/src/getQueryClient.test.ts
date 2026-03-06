import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadGetQueryClientModule(isServer: boolean) {
  vi.resetModules();

  class MockQueryClient {}

  vi.doMock('@tanstack/react-query', () => ({
    QueryClient: MockQueryClient,
    isServer
  }));

  const module = await import('./getQueryClient.js');

  return {
    MockQueryClient,
    getQueryClient: module.getQueryClient
  };
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('@tanstack/react-query');
});

describe('getQueryClient', () => {
  it('creates a new query client on every server call', async () => {
    const { MockQueryClient, getQueryClient } =
      await loadGetQueryClientModule(true);

    const firstClient = getQueryClient();
    const secondClient = getQueryClient();

    expect(firstClient).toBeInstanceOf(MockQueryClient);
    expect(secondClient).toBeInstanceOf(MockQueryClient);
    expect(firstClient).not.toBe(secondClient);
  });

  it('reuses the same query client in the browser', async () => {
    const { MockQueryClient, getQueryClient } =
      await loadGetQueryClientModule(false);

    const firstClient = getQueryClient();
    const secondClient = getQueryClient();

    expect(firstClient).toBeInstanceOf(MockQueryClient);
    expect(secondClient).toBeInstanceOf(MockQueryClient);
    expect(firstClient).toBe(secondClient);
  });
});
