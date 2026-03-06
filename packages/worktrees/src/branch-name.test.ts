import { describe, expect, it } from 'vitest';

import { makeIssueBranchName } from './branch-name.js';

describe('makeIssueBranchName', () => {
  it('builds deterministic issue branch names from issue number and title', () => {
    expect(makeIssueBranchName(142, 'Improve planner routing')).toBe(
      'issue/142-improve-planner-routing'
    );
    expect(makeIssueBranchName(142, 'Improve planner routing')).toBe(
      'issue/142-improve-planner-routing'
    );
  });

  it('normalizes punctuation, casing, spacing, and diacritics', () => {
    expect(
      makeIssueBranchName(211, "  Next.js challenge: Bootstrap l'été 🚀  ")
    ).toBe('issue/211-nextjs-challenge-bootstrap-lete');
  });

  it('uses a deterministic fallback slug when title cannot produce a slug', () => {
    expect(makeIssueBranchName(402, '   ')).toBe('issue/402-work-item');
    expect(makeIssueBranchName(403, '***', { fallbackSlug: 'queued-work' })).toBe(
      'issue/403-queued-work'
    );
  });

  it('truncates the slug deterministically to fit the configured max length', () => {
    const branchName = makeIssueBranchName(
      77,
      'This is an exceptionally verbose title intended to exceed the branch length cap',
      { maxLength: 34 }
    );

    expect(branchName).toBe('issue/77-this-is-an-exceptionally');
    expect(branchName.length).toBeLessThanOrEqual(34);
  });

  it('rejects invalid issue numbers and max lengths', () => {
    expect(() => makeIssueBranchName(0, 'valid title')).toThrow(
      'Issue number must be a positive integer.'
    );
    expect(() => makeIssueBranchName(1.2, 'valid title')).toThrow(
      'Issue number must be a positive integer.'
    );
    expect(() => makeIssueBranchName(12, 'valid title', { maxLength: 0 })).toThrow(
      'Branch maxLength must be a positive integer.'
    );
  });

  it('rejects max length values that cannot fit the issue prefix and slug', () => {
    expect(() => makeIssueBranchName(999, 'title', { maxLength: 9 })).toThrow(
      'Branch maxLength "9" is too short for issue prefix "issue/999-".'
    );
  });
});
