import type {
  CapabilityKey,
  ModelProvider,
  RoleName
} from '@evolvo/core/model-routing-config';
import type { PromptDefinitionConfig } from '@evolvo/core/prompt-definition-config';
import {
  resolveModelRoute,
  type ResolvedModelRoute,
  type RuntimeModelRouteOverride
} from '@evolvo/models/model-routing-resolver';
import type {
  ModelInvocationMetadata,
  ModelProviderClient,
  ModelProviderInvocationRequest,
  ModelProviderInvocationResult
} from '@evolvo/models/model-provider';
import { createOllamaProvider } from '@evolvo/models/ollama-provider';
import { createOpenAIProvider } from '@evolvo/models/openai-provider';

export type RoleProviderClients = {
  ollama: ModelProviderClient;
  openai: ModelProviderClient;
};

export type RoleProviderClientOverrides = Partial<RoleProviderClients>;

export type StructuredOutputSchema<TOutput> = NonNullable<
  ModelProviderInvocationRequest<TOutput>['schema']
>;

export type InvokeRoutedStructuredRoleInput<TOutput> = {
  attemptId?: string;
  capability?: CapabilityKey;
  metadata?: ModelInvocationMetadata;
  policy?: unknown;
  promptDefinition?: PromptDefinitionConfig;
  providerClients?: RoleProviderClientOverrides;
  role: RoleName;
  routeOverride?: RuntimeModelRouteOverride;
  schema: StructuredOutputSchema<TOutput>;
  systemPrompt: string;
  taskKind: string;
  userPrompt: string;
};

export type RoutedStructuredRoleResult<TOutput> = {
  invocation: ModelProviderInvocationResult<TOutput>;
  output: TOutput;
  route: ResolvedModelRoute;
  usedFallback: boolean;
};

export type InvokeRoutedStructuredRole = <TOutput>(
  input: InvokeRoutedStructuredRoleInput<TOutput>
) => Promise<RoutedStructuredRoleResult<TOutput>>;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function resolveProviderClient(
  provider: ModelProvider,
  providerClients: RoleProviderClientOverrides | undefined
): ModelProviderClient {
  const overrideClient = providerClients?.[provider];

  if (overrideClient) {
    return overrideClient;
  }

  if (provider === 'openai') {
    return createOpenAIProvider();
  }

  return createOllamaProvider();
}

async function invokeStructuredOutputOnRoute<TOutput>(
  input: InvokeRoutedStructuredRoleInput<TOutput>,
  route: ResolvedModelRoute,
  fallbackUsed: boolean
): Promise<ModelProviderInvocationResult<TOutput>> {
  const providerClient = resolveProviderClient(route.provider, input.providerClients);

  return providerClient.invoke({
    attemptId: input.attemptId,
    fallbackUsed,
    maxRetries: route.maxRetries,
    maxTokens: route.maxTokens,
    metadata: {
      ...(input.metadata ?? {}),
      ...(input.promptDefinition
        ? {
            promptKey: input.promptDefinition.promptKey,
            promptResponseMode: input.promptDefinition.responseMode,
            promptTitle: input.promptDefinition.title,
            promptVersion: input.promptDefinition.version
          }
        : {}),
      resolvedCapability: route.capability,
      resolvedModel: route.model,
      resolvedProvider: route.provider,
      resolvedRouteSource: route.source
    },
    model: route.model,
    responseMode: 'json',
    role: route.role,
    schema: input.schema,
    systemPrompt: input.systemPrompt,
    taskKind: input.taskKind,
    temperature: route.temperature,
    timeoutMs: route.timeoutMs,
    userPrompt: input.userPrompt
  });
}

export const invokeRoutedStructuredRole: InvokeRoutedStructuredRole = async <
  TOutput
>(
  input: InvokeRoutedStructuredRoleInput<TOutput>
): Promise<RoutedStructuredRoleResult<TOutput>> => {
  const primaryRoute = resolveModelRoute({
    capability: input.capability,
    policy: input.policy,
    role: input.role,
    runtimeOverride: input.routeOverride
  });

  try {
    const invocation = await invokeStructuredOutputOnRoute(
      input,
      primaryRoute,
      false
    );

    return {
      invocation,
      output: invocation.output,
      route: primaryRoute,
      usedFallback: false
    };
  } catch (primaryError) {
    if (!primaryRoute.fallback) {
      throw primaryError;
    }

    const fallbackRoute = resolveModelRoute({
      capability: input.capability,
      policy: input.policy,
      role: input.role,
      runtimeOverride: input.routeOverride,
      useFallback: true
    });

    try {
      const fallbackInvocation = await invokeStructuredOutputOnRoute(
        input,
        fallbackRoute,
        true
      );

      return {
        invocation: fallbackInvocation,
        output: fallbackInvocation.output,
        route: fallbackRoute,
        usedFallback: true
      };
    } catch (fallbackError) {
      throw new Error(
        `Role "${input.role}" invocation failed on primary route (${primaryRoute.provider}/${primaryRoute.model}) and fallback route (${fallbackRoute.provider}/${fallbackRoute.model}): primary=${toErrorMessage(primaryError)}; fallback=${toErrorMessage(fallbackError)}`
      );
    }
  }
};
