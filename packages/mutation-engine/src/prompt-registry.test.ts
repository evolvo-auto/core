import { describe, expect, it, vi } from 'vitest';

import {
  listGenomePromptRegistry,
  syncPromptDefinitionRegistry
} from './prompt-registry.ts';

describe('prompt registry', () => {
  it('lists the active genome prompt definitions', () => {
    expect(listGenomePromptRegistry()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          promptKey: 'planner',
          role: 'planner',
          version: 1
        }),
        expect.objectContaining({
          promptKey: 'selector',
          role: 'governor',
          version: 1
        })
      ])
    );
  });

  it('syncs prompt definitions with rendered system and sample user prompts', async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: 'prompt_1'
    });

    await expect(
      syncPromptDefinitionRegistry({
        upsert
      })
    ).resolves.toHaveLength(7);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        promptKey: 'planner',
        responseMode: 'json',
        role: 'planner',
        sampleInputJson: expect.objectContaining({
          issueNumber: 106
        }),
        sampleUserPrompt: expect.stringContaining(
          'Output shape template (replace the values, keep every key):'
        ),
        sourceFingerprint: expect.any(String),
        systemPrompt: expect.stringContaining(
          'Every required field must be present in the JSON output.'
        ),
        title: 'Planner issue decomposition'
      })
    );
  });
});
