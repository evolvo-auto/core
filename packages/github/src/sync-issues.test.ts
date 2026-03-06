import { afterEach, describe, expect, it, vi } from 'vitest';

import { syncRepositoryIssues } from './issue-sync.js';
import { parseIssueSyncCliArgs, runIssueSyncCli } from './sync-issues.js';

vi.mock('./issue-sync.js', () => ({
  syncRepositoryIssues: vi.fn().mockResolvedValue({
    classifiedIssues: [],
    dryRun: true,
    fetchedCount: 0,
    ignoredPullRequestCount: 0,
    normalizedRecords: [],
    persistedCount: 0
  })
}));

const mockedSyncRepositoryIssues = vi.mocked(syncRepositoryIssues);

describe('issue sync CLI', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses dry-run and state arguments', () => {
    expect(parseIssueSyncCliArgs(['--dry-run', '--state=all'])).toEqual({
      dryRun: true,
      state: 'all'
    });
    expect(parseIssueSyncCliArgs(['--state', 'closed'])).toEqual({
      dryRun: false,
      state: 'closed'
    });
  });

  it('rejects unsupported arguments', () => {
    expect(() => parseIssueSyncCliArgs(['--bad-flag'])).toThrow(
      'Unsupported argument "--bad-flag". Supported arguments: --dry-run, --state'
    );
    expect(() => parseIssueSyncCliArgs(['--state=invalid'])).toThrow(
      'Unsupported --state value. Supported values: open, closed, all'
    );
  });

  it('runs sync and prints json output', async () => {
    const writeSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    await runIssueSyncCli(['--dry-run', '--state', 'all']);

    expect(mockedSyncRepositoryIssues).toHaveBeenCalledWith({
      dryRun: true,
      state: 'all'
    });
    expect(writeSpy).toHaveBeenCalledOnce();
  });
});
