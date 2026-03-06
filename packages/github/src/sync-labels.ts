import { syncRepositoryLabels } from './labels.js';

export type LabelSyncCliOptions = {
  dryRun: boolean;
};

export function parseLabelSyncCliArgs(args: string[]): LabelSyncCliOptions {
  const supportedArguments = new Set(['--dry-run']);

  for (const argument of args) {
    if (!supportedArguments.has(argument)) {
      throw new Error(
        `Unsupported argument "${argument}". Supported arguments: --dry-run`
      );
    }
  }

  return {
    dryRun: args.includes('--dry-run')
  };
}

export async function runLabelSyncCli(
  args: string[] = process.argv.slice(2)
): Promise<void> {
  const options = parseLabelSyncCliArgs(args);
  const result = await syncRepositoryLabels({
    dryRun: options.dryRun
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (import.meta.main) {
  try {
    await runLabelSyncCli();
    process.exit(0);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  }
}
