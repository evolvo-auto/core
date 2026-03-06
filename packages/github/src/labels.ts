import { getGitHubContext } from './auth.js';
import type {
  CreateRepositoryLabelInput,
  GitHubContext,
  GitHubLabel,
  ListRepositoryLabelsOptions,
  UpdateRepositoryLabelInput
} from './types.js';

export async function listRepositoryLabels(
  options: ListRepositoryLabelsOptions = {},
  context: GitHubContext = getGitHubContext()
): Promise<GitHubLabel[]> {
  const { perPage, ...rest } = options;
  const { data } = await context.octokit.rest.issues.listLabelsForRepo({
    ...context.repository,
    ...rest,
    per_page: perPage
  });

  return data;
}

export async function createRepositoryLabel(
  input: CreateRepositoryLabelInput,
  context: GitHubContext = getGitHubContext()
): Promise<GitHubLabel> {
  const { data } = await context.octokit.rest.issues.createLabel({
    ...context.repository,
    ...input
  });

  return data;
}

export async function updateRepositoryLabel(
  currentName: string,
  input: UpdateRepositoryLabelInput,
  context: GitHubContext = getGitHubContext()
): Promise<GitHubLabel> {
  const { data } = await context.octokit.rest.issues.updateLabel({
    ...context.repository,
    color: input.color,
    description: input.description,
    name: currentName,
    new_name: input.newName
  });

  return data;
}
