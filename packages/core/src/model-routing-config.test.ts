import { describe, expect, it } from 'vitest';

import { routingPolicy } from '../../../genome/routing/model-routing.js';
import {
  parseRoutingPolicy,
  routingPolicyConfigSchema
} from './model-routing-config.js';

describe('model routing config', () => {
  it('parses the default routing policy from genome', () => {
    expect(parseRoutingPolicy(routingPolicy)).toMatchObject({
      defaultRoleRouting: expect.arrayContaining([
        expect.objectContaining({
          role: 'builder',
          provider: 'openai'
        })
      ]),
      providerPriority: ['ollama', 'openai']
    });
  });

  it('rejects duplicate role entries in the default routing list', () => {
    expect(() =>
      routingPolicyConfigSchema.parse({
        ...routingPolicy,
        defaultRoleRouting: [
          ...routingPolicy.defaultRoleRouting,
          routingPolicy.defaultRoleRouting[0]
        ]
      })
    ).toThrowError('Duplicate routing entry for role: governor');
  });

  it('rejects provider priorities with duplicates', () => {
    expect(() =>
      routingPolicyConfigSchema.parse({
        ...routingPolicy,
        providerPriority: ['ollama', 'ollama']
      })
    ).toThrowError('providerPriority must not contain duplicates');
  });
});
