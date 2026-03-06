import { getGitHubContext } from './auth.js';
import { canonicalGitHubLabels } from './label-taxonomy.js';
import type {
  CreateRepositoryLabelInput,
  GitHubContext,
  GitHubLabelDefinition,
  GitHubLabelSyncChange,
  GitHubLabelSyncResult,
  GitHubLabel,
  ListRepositoryLabelsOptions,
  SyncRepositoryLabelsOptions,
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

function normalizeLabelColor(color: string | null | undefined): string {
  return (color ?? '').trim().toLowerCase();
}

function normalizeLabelDescription(
  description: string | null | undefined
): string {
  return (description ?? '').trim();
}

function normalizeLabelName(name: string): string {
  return name.trim().toLowerCase();
}

function buildLabelSyncChange(
  label: GitHubLabelDefinition,
  action: GitHubLabelSyncChange['action'],
  currentLabel?: GitHubLabel
): GitHubLabelSyncChange {
  return {
    action,
    currentColor: currentLabel?.color,
    currentDescription: currentLabel?.description ?? undefined,
    group: label.group,
    name: label.name,
    nextColor: label.color,
    nextDescription: label.description
  };
}

export async function listAllRepositoryLabels(
  context: GitHubContext = getGitHubContext()
): Promise<GitHubLabel[]> {
  const labels: GitHubLabel[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const batch = await listRepositoryLabels({ page, perPage }, context);

    labels.push(...batch);

    if (batch.length < perPage) {
      return labels;
    }

    page += 1;
  }
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

export async function syncRepositoryLabels(
  options: SyncRepositoryLabelsOptions = {},
  context: GitHubContext = getGitHubContext()
): Promise<GitHubLabelSyncResult> {
  const definitions = options.definitions ?? canonicalGitHubLabels;
  const existingLabels = await listAllRepositoryLabels(context);
  const existingLabelsByName = new Map(
    existingLabels.map((label) => [normalizeLabelName(label.name), label])
  );
  const created: GitHubLabelSyncChange[] = [];
  const unchanged: GitHubLabelSyncChange[] = [];
  const updated: GitHubLabelSyncChange[] = [];

  for (const definition of definitions) {
    const currentLabel = existingLabelsByName.get(
      normalizeLabelName(definition.name)
    );

    if (!currentLabel) {
      const change = buildLabelSyncChange(definition, 'create');

      created.push(change);

      if (!options.dryRun) {
        await createRepositoryLabel(
          {
            color: definition.color,
            description: definition.description,
            name: definition.name
          },
          context
        );
      }

      continue;
    }

    const colorChanged =
      normalizeLabelColor(currentLabel.color) !==
      normalizeLabelColor(definition.color);
    const descriptionChanged =
      normalizeLabelDescription(currentLabel.description) !==
      normalizeLabelDescription(definition.description);

    if (colorChanged || descriptionChanged) {
      const change = buildLabelSyncChange(definition, 'update', currentLabel);

      updated.push(change);

      if (!options.dryRun) {
        await updateRepositoryLabel(
          currentLabel.name,
          {
            color: definition.color,
            description: definition.description
          },
          context
        );
      }

      continue;
    }

    unchanged.push(buildLabelSyncChange(definition, 'unchanged', currentLabel));
  }

  const managedNames = new Set(
    definitions.map((label) => normalizeLabelName(label.name))
  );
  const extraLabels = existingLabels
    .filter((label) => !managedNames.has(normalizeLabelName(label.name)))
    .map((label) => ({
      color: label.color,
      description: label.description ?? null,
      name: label.name
    }));

  return {
    created,
    dryRun: options.dryRun ?? false,
    extraLabels,
    totalExisting: existingLabels.length,
    totalManaged: definitions.length,
    unchanged,
    updated
  };
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
