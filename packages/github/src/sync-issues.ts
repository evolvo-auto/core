import { syncRepositoryIssues } from './issue-sync.js';

export type IssueSyncCliOptions = {
  dryRun: boolean;
  state: 'all' | 'closed' | 'open';
};

const supportedStates = new Set(['all', 'closed', 'open']);

export function parseIssueSyncCliArgs(args: string[]): IssueSyncCliOptions {
  let dryRun = false;
  let state: IssueSyncCliOptions['state'] = 'open';

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (argument === '--state') {
      const nextValue = args[index + 1];

      if (!nextValue || !supportedStates.has(nextValue)) {
        throw new Error(
          'Unsupported --state value. Supported values: open, closed, all'
        );
      }

      state = nextValue as IssueSyncCliOptions['state'];
      index += 1;
      continue;
    }

    if (argument.startsWith('--state=')) {
      const inlineValue = argument.split('=')[1];

      if (!inlineValue || !supportedStates.has(inlineValue)) {
        throw new Error(
          'Unsupported --state value. Supported values: open, closed, all'
        );
      }

      state = inlineValue as IssueSyncCliOptions['state'];
      continue;
    }

    throw new Error(
      `Unsupported argument "${argument}". Supported arguments: --dry-run, --state`
    );
  }

  return {
    dryRun,
    state
  };
}

export async function runIssueSyncCli(
  args: string[] = process.argv.slice(2)
): Promise<void> {
  const options = parseIssueSyncCliArgs(args);
  const result = await syncRepositoryIssues({
    dryRun: options.dryRun,
    state: options.state
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (import.meta.main) {
  try {
    await runIssueSyncCli();
    process.exit(0);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  }
}
