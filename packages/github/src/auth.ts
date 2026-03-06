import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig, type GitHubConfig } from '@evolvo/core/config-loader';
import { Octokit } from 'octokit';

import type { GitHubContext } from './types.js';

export const defaultGitHubUserAgent = 'evolvo-github-client';
export const githubWorkspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..'
);

export type CreateGitHubContextOptions = {
  baseUrl?: string;
  config?: GitHubConfig;
  userAgent?: string;
};

let sharedGitHubContext: GitHubContext | undefined;

export function createGitHubContext(
  options: CreateGitHubContextOptions = {}
): GitHubContext {
  const githubConfig =
    options.config ?? loadConfig({ cwd: githubWorkspaceRoot }).github;

  return {
    octokit: new Octokit({
      auth: githubConfig.token,
      baseUrl: options.baseUrl,
      userAgent: options.userAgent ?? defaultGitHubUserAgent
    }),
    repository: {
      owner: githubConfig.owner,
      repo: githubConfig.repo
    }
  };
}

export function getGitHubContext(): GitHubContext {
  sharedGitHubContext ??= createGitHubContext();

  return sharedGitHubContext;
}
