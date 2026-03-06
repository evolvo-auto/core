import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('@evolvo/core/config-loader');
  vi.doUnmock('octokit');
});

describe('GitHub auth context', () => {
  it('creates an authenticated Octokit context from explicit config', async () => {
    const capturedOptions: unknown[] = [];

    vi.doMock('@evolvo/core/config-loader', () => ({
      loadConfig: vi.fn()
    }));

    vi.doMock('octokit', () => ({
      Octokit: class MockOctokit {
        constructor(options: unknown) {
          capturedOptions.push(options);
        }
      }
    }));

    const { createGitHubContext } = await import('./auth.js');
    const context = createGitHubContext({
      baseUrl: 'https://github.example/api/v3',
      config: {
        owner: 'evolvo-auto',
        repo: 'core',
        token: 'github-token'
      },
      userAgent: 'evolvo-test-client'
    });

    expect(context.repository).toEqual({
      owner: 'evolvo-auto',
      repo: 'core'
    });
    expect(capturedOptions).toEqual([
      {
        auth: 'github-token',
        baseUrl: 'https://github.example/api/v3',
        userAgent: 'evolvo-test-client'
      }
    ]);
  });

  it('caches the shared GitHub context and loads config from the workspace root', async () => {
    const loadConfig = vi.fn().mockReturnValue({
      github: {
        owner: 'evolvo-auto',
        repo: 'core',
        token: 'github-token'
      }
    });

    vi.doMock('@evolvo/core/config-loader', () => ({
      loadConfig
    }));

    vi.doMock('octokit', () => ({
      Octokit: class MockOctokit {}
    }));

    const authModule = await import('./auth.js');
    const firstContext = authModule.getGitHubContext();
    const secondContext = authModule.getGitHubContext();

    expect(firstContext).toBe(secondContext);
    expect(loadConfig).toHaveBeenCalledTimes(1);
    expect(loadConfig).toHaveBeenCalledWith({
      cwd: authModule.githubWorkspaceRoot
    });
  });
});
