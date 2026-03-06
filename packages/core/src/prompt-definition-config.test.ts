import { describe, expect, it } from 'vitest';

import {
  parsePromptDefinitionConfig,
  promptDefinitionConfigSchema
} from './prompt-definition-config.ts';

describe('prompt definition config', () => {
  it('parses valid prompt definition metadata', () => {
    expect(
      parsePromptDefinitionConfig({
        promptKey: 'planner',
        responseMode: 'json',
        role: 'planner',
        title: 'Planner prompt',
        version: 2
      })
    ).toMatchObject({
      promptKey: 'planner',
      responseMode: 'json',
      role: 'planner',
      version: 2
    });
  });

  it('rejects blank prompt keys', () => {
    expect(() =>
      promptDefinitionConfigSchema.parse({
        promptKey: ' ',
        responseMode: 'json',
        role: 'planner',
        title: 'Planner prompt',
        version: 1
      })
    ).toThrowError();
  });
});
