import {
  parsePromptDefinitionConfig,
  type PromptDefinitionConfig
} from '@evolvo/core/prompt-definition-config';

export type PromptDefinition<TInput> = PromptDefinitionConfig & {
  buildSystemPrompt: () => string;
  buildUserPrompt: (input: TInput) => string;
};

export function createPromptDefinition<TInput>(
  definition: PromptDefinition<TInput>
): PromptDefinition<TInput> {
  parsePromptDefinitionConfig({
    lineageParentVersion: definition.lineageParentVersion,
    lineageReason: definition.lineageReason,
    promptKey: definition.promptKey,
    responseMode: definition.responseMode,
    role: definition.role,
    sourceMutationId: definition.sourceMutationId,
    title: definition.title,
    version: definition.version
  });

  return definition;
}
