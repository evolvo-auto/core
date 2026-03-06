import { runMutatorRole } from '@evolvo/orchestration/mutator-role';
import type { MutationProposal } from '@evolvo/schemas/role-output-schemas';

export type GenerateMutationProposalInput = Parameters<typeof runMutatorRole>[0];

export type GenerateMutationProposalDependencies = {
  generate?: typeof runMutatorRole;
};

export async function generateMutationProposal(
  input: GenerateMutationProposalInput,
  dependencies: GenerateMutationProposalDependencies = {}
): Promise<MutationProposal> {
  const generate = dependencies.generate ?? runMutatorRole;

  return generate(input);
}
