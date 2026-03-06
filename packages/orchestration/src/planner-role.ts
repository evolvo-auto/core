import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  plannerPrompt,
  type PlannerPromptInput
} from '@evolvo/genome/prompts/planner';
import {
  plannerOutputSchema,
  type PlannerOutput
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

export type PlannerRoleInput = PlannerPromptInput & {
  attemptId?: string;
  capability?: CapabilityKey;
};

export async function runPlannerRole(
  input: PlannerRoleInput,
  invokeRole: InvokeRoutedStructuredRole = invokeRoutedStructuredRole
): Promise<PlannerOutput> {
  const result = await invokeRole<PlannerOutput>({
    attemptId: input.attemptId,
    capability: input.capability ?? 'general',
    metadata: {
      inputIssueNumber: input.issueNumber,
      inputLabels: input.labels ?? [],
      roleName: 'planner'
    },
    promptDefinition: plannerPrompt,
    role: 'planner',
    schema: plannerOutputSchema,
    systemPrompt: plannerPrompt.buildSystemPrompt(),
    taskKind: 'issue-planning',
    userPrompt: plannerPrompt.buildUserPrompt(input)
  });

  if (result.output.issueNumber !== input.issueNumber) {
    throw new Error(
      `Planner output issueNumber "${result.output.issueNumber}" did not match input issueNumber "${input.issueNumber}".`
    );
  }

  return result.output;
}
