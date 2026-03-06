import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('./labels.js');
});

describe('GitHub label sync CLI', () => {
  it('parses dry-run arguments and rejects unsupported flags', async () => {
    const { parseLabelSyncCliArgs } = await import('./sync-labels.js');

    expect(parseLabelSyncCliArgs([])).toEqual({ dryRun: false });
    expect(parseLabelSyncCliArgs(['--dry-run'])).toEqual({ dryRun: true });
    expect(() => parseLabelSyncCliArgs(['--unknown'])).toThrowError(
      'Unsupported argument "--unknown". Supported arguments: --dry-run'
    );
  });

  it('runs label sync and prints the JSON result', async () => {
    const syncRepositoryLabels = vi.fn().mockResolvedValue({
      created: [{ action: 'create', name: 'source:human' }],
      dryRun: true,
      extraLabels: [],
      totalExisting: 9,
      totalManaged: 59,
      unchanged: [],
      updated: []
    });
    const stdoutWrite = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    vi.doMock('./labels.js', () => ({
      syncRepositoryLabels
    }));

    const { runLabelSyncCli } = await import('./sync-labels.js');

    await runLabelSyncCli(['--dry-run']);

    expect(syncRepositoryLabels).toHaveBeenCalledWith({
      dryRun: true
    });
    expect(stdoutWrite).toHaveBeenCalledWith(
      `${JSON.stringify(
        {
          created: [{ action: 'create', name: 'source:human' }],
          dryRun: true,
          extraLabels: [],
          totalExisting: 9,
          totalManaged: 59,
          unchanged: [],
          updated: []
        },
        null,
        2
      )}\n`
    );

    stdoutWrite.mockRestore();
  });
});
