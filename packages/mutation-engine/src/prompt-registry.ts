import { createHash } from 'node:crypto';

import {
  upsertPromptDefinition
} from '@evolvo/api/prompt-definition';
import type {
  Prisma,
  PromptDefinition as PersistedPromptDefinition
} from '@evolvo/api/generated/prisma/client';
import { builderPrompt } from '@evolvo/genome/prompts/builder';
import { criticPrompt } from '@evolvo/genome/prompts/critic';
import {
  evaluatorInterpreterPrompt
} from '@evolvo/genome/prompts/evaluator-interpreter';
import { mutatorPrompt } from '@evolvo/genome/prompts/mutator';
import { narratorPrompt } from '@evolvo/genome/prompts/narrator';
import { plannerPrompt } from '@evolvo/genome/prompts/planner';
import type { PromptDefinition } from '@evolvo/genome/prompts/prompt-definition';
import { selectorPrompt } from '@evolvo/genome/prompts/selector';

type PromptRegistryEntry = {
  buildSystemPrompt: () => string;
  buildUserPrompt: (input: Prisma.InputJsonValue) => string;
  lineageParentVersion?: number | null;
  lineageReason?: string | null;
  promptKey: string;
  responseMode: 'json' | 'text';
  role: string;
  sampleInput: Prisma.InputJsonValue;
  sourceMutationId?: string | null;
  title: string;
  version: number;
};

export type SyncPromptDefinitionRegistryDependencies = {
  upsert?: typeof upsertPromptDefinition;
};

function createPromptRegistryEntry<TInput extends Prisma.InputJsonValue>(
  prompt: PromptDefinition<TInput>,
  sampleInput: TInput
): PromptRegistryEntry {
  return {
    ...prompt,
    buildUserPrompt: (input) => prompt.buildUserPrompt(input as TInput),
    sampleInput
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right)
  );

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(',')}}`;
}

function buildPromptFingerprint(input: {
  prompt: PromptRegistryEntry;
  sampleUserPrompt: string;
  systemPrompt: string;
}): string {
  return createHash('sha256')
    .update(
      stableStringify({
        lineageParentVersion: input.prompt.lineageParentVersion ?? null,
        promptKey: input.prompt.promptKey,
        responseMode: input.prompt.responseMode,
        role: input.prompt.role,
        sampleInput: input.prompt.sampleInput,
        sampleUserPrompt: input.sampleUserPrompt,
        sourceMutationId: input.prompt.sourceMutationId ?? null,
        systemPrompt: input.systemPrompt,
        title: input.prompt.title,
        version: input.prompt.version
      })
    )
    .digest('hex');
}

export function listGenomePromptRegistry(): PromptRegistryEntry[] {
  return [
    createPromptRegistryEntry(builderPrompt, {
        acceptanceCriteria: ['All touched code paths pass verification.'],
        filesActuallyChanged: ['packages/orchestration/src/planner-role.ts'],
        filesIntendedToChange: ['packages/orchestration/src/planner-role.ts'],
        implementationNotes: ['Planner prompt guidance was tightened.'],
        issueNumber: 101,
        objective: 'Harden planner schema output reliability.',
        planSummary: 'Tighten schema guidance.',
        possibleKnownRisks: ['May overconstrain planner outputs.'],
        summaryHint: 'Prompt guidance update.'
      }),
    createPromptRegistryEntry(criticPrompt, {
        acceptanceCriteria: ['Planner emits valid JSON output.'],
        changedFiles: ['genome/prompts/planner.ts'],
        commandResults: [
          {
            exitCode: 0,
            name: 'typecheck'
          }
        ],
        implementationSummary: 'Prompt contract was strengthened.',
        issueNumber: 102,
        notes: ['Validation succeeded.'],
        objective: 'Improve planner prompt reliability.',
        observedFailures: []
      }),
    createPromptRegistryEntry(evaluatorInterpreterPrompt, {
        acceptanceCriteria: ['Genome prompts are versioned.'],
        builderSummary: 'Prompt registry added.',
        changedFiles: ['packages/mutation-engine/src/prompt-registry.ts'],
        checks: [
          {
            name: 'test',
            result: 'passed'
          }
        ],
        issueNumber: 103,
        objective: 'Track prompt lineage.',
        observedFailures: []
      }),
    createPromptRegistryEntry(mutatorPrompt, {
        benchmarkIds: ['planner-json-validity'],
        candidateSurfaces: ['prompts'],
        failureSummary: 'Planner repeatedly omitted required fields.',
        likelyRootCauses: ['Prompt contract lacks strong schema guidance.'],
        recurrenceHints: ['Repeated schema repair attempts were needed.'],
        replayIssueNumbers: [104],
        sourceFailureIds: ['failure_104'],
        sourceIssueNumber: 104
      }),
    createPromptRegistryEntry(narratorPrompt, {
        commentKind: 'mutation-rationale',
        evidence: ['Planner prompt v2 improved JSON validity.'],
        nextStep: 'Run benchmark validation.',
        status: 'proposed',
        summary: 'Planner prompt lineage has advanced.',
        target: 'issue',
        targetNumber: 105,
        titleHint: 'Explain prompt mutation',
        whatChanged: ['Versioned planner prompt metadata was updated.']
      }),
    createPromptRegistryEntry(plannerPrompt, {
        acceptanceCriteriaHints: ['Track prompt lineage for planner changes.'],
        assumptions: ['Mutation issues can target prompts.'],
        body: 'Track prompt lineage in the genome registry.',
        capabilityTagsHints: ['typescript', 'prompt-mutation'],
        constraints: ['Do not use barrel files.'],
        dependencies: [],
        issueNumber: 106,
        kindHint: 'mutation',
        labels: ['kind:mutation', 'surface:prompts'],
        relevantSurfacesHints: ['prompts', 'memory'],
        title: 'Track prompt lineage'
      }),
    createPromptRegistryEntry(selectorPrompt, {
        candidateIssues: [
          {
            issueNumber: 107,
            title: 'Execute prompt mutation issue'
          }
        ],
        candidateMutations: [
          {
            mutationId: 'mutation_107',
            priorityScore: 85,
            summary: 'Improve planner prompt schema reliability.',
            targetSurface: 'prompts',
            title: 'Planner prompt contract mutation'
          }
        ],
        candidatePromotions: [],
        currentFocusIssueNumber: 107,
        strategyNotes: ['Prompt mutation has repeated supporting failures.']
      })
  ];
}

export async function syncPromptDefinitionRegistry(
  dependencies: SyncPromptDefinitionRegistryDependencies = {}
): Promise<PersistedPromptDefinition[]> {
  const upsert = dependencies.upsert ?? upsertPromptDefinition;
  const definitions: PersistedPromptDefinition[] = [];

  for (const prompt of listGenomePromptRegistry()) {
    const systemPrompt = prompt.buildSystemPrompt();
    const sampleUserPrompt = prompt.buildUserPrompt(prompt.sampleInput);

    definitions.push(
      await upsert({
        lineageReason: prompt.lineageReason ?? null,
        promptKey: prompt.promptKey,
        responseMode: prompt.responseMode,
        role: prompt.role,
        sampleInputJson: prompt.sampleInput,
        sampleUserPrompt,
        sourceFingerprint: buildPromptFingerprint({
          prompt,
          sampleUserPrompt,
          systemPrompt
        }),
        sourceMutationId: prompt.sourceMutationId ?? null,
        systemPrompt,
        title: prompt.title
      })
    );
  }

  return definitions;
}
