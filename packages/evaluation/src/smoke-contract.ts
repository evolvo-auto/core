import { URL } from 'node:url';

export type SmokeRouteCheck = {
  expectedStatus?: number;
  expectedText?: string;
  name?: string;
  path: string;
};

export type SmokeStartupCommand = {
  args?: string[];
  command: string;
  cwd?: string;
  readyPath?: string;
  startupTimeoutMs?: number;
};

export type SmokeContract = {
  baseUrl: string;
  browserPath?: string;
  routeChecks?: SmokeRouteCheck[];
  startupCommand?: SmokeStartupCommand;
  usePlaywright?: boolean;
};

export type SmokeCheckResult = {
  name: string;
  notes: string[];
  path: string;
  result: 'failed' | 'passed';
  statusCode?: number;
  url: string;
};

export type SmokeContractResult = {
  browserCheck?: {
    notes: string[];
    path: string;
    result: 'failed' | 'passed' | 'skipped';
  };
  notes: string[];
  passed: boolean;
  routeChecks: SmokeCheckResult[];
};

export type RunSmokeContractDependencies = {
  fetchImpl?: typeof fetch;
  runPlaywrightCheck?: (url: string) => Promise<{
    notes: string[];
    passed: boolean;
  }>;
};

const defaultRouteChecks: SmokeRouteCheck[] = [
  {
    expectedStatus: 200,
    name: 'health',
    path: '/api/health'
  },
  {
    expectedStatus: 200,
    name: 'root',
    path: '/'
  }
];

function normalizeBaseUrl(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');

  if (!normalizedBaseUrl) {
    throw new Error('Smoke contract baseUrl is required.');
  }

  return normalizedBaseUrl;
}

function normalizePath(path: string): string {
  const normalizedPath = path.trim();

  if (!normalizedPath) {
    throw new Error('Smoke contract path is required.');
  }

  return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
}

async function defaultRunPlaywrightCheck(url: string): Promise<{
  notes: string[];
  passed: boolean;
}> {
  const moduleName = 'playwright';

  let playwrightModule: {
    chromium?: {
      launch: (options: { headless: boolean }) => Promise<{
        close: () => Promise<void>;
        newPage: () => Promise<{
          close: () => Promise<void>;
          goto: (pageUrl: string, options: { waitUntil: 'networkidle' }) => Promise<void>;
          title: () => Promise<string>;
        }>;
      }>;
    };
  };

  try {
    playwrightModule = (await import(moduleName)) as typeof playwrightModule;
  } catch {
    return {
      notes: ['Playwright is not installed, so browser smoke could not run.'],
      passed: false
    };
  }

  if (!playwrightModule.chromium) {
    return {
      notes: ['Playwright chromium launcher was unavailable.'],
      passed: false
    };
  }

  const browser = await playwrightModule.chromium.launch({
    headless: true
  });

  try {
    const page = await browser.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'networkidle'
      });

      return {
        notes: [`Browser reached ${url} with title "${await page.title()}".`],
        passed: true
      };
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

export async function runSmokeContract(
  input: SmokeContract,
  dependencies: RunSmokeContractDependencies = {}
): Promise<SmokeContractResult> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const runPlaywrightCheck =
    dependencies.runPlaywrightCheck ?? defaultRunPlaywrightCheck;
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const routeChecks = input.routeChecks?.length
    ? input.routeChecks
    : defaultRouteChecks;
  const notes: string[] = [];
  const routeCheckResults: SmokeCheckResult[] = [];

  for (const routeCheck of routeChecks) {
    const path = normalizePath(routeCheck.path);
    const url = new URL(path, `${baseUrl}/`).toString();
    const response = await fetchImpl(url, {
      headers: {
        accept: 'text/html,application/json;q=0.9,*/*;q=0.8'
      }
    });
    const responseText = await response.text();
    const expectedStatus = routeCheck.expectedStatus ?? 200;
    const passedStatus = response.status === expectedStatus;
    const passedText =
      routeCheck.expectedText === undefined ||
      responseText.includes(routeCheck.expectedText);
    const result = passedStatus && passedText ? 'passed' : 'failed';
    const checkNotes = [
      `Received status ${response.status}.`,
      ...(routeCheck.expectedText
        ? [
            passedText
              ? `Expected text "${routeCheck.expectedText}" was present.`
              : `Expected text "${routeCheck.expectedText}" was not present.`
          ]
        : [])
    ];

    routeCheckResults.push({
      name: routeCheck.name?.trim() || path,
      notes: checkNotes,
      path,
      result,
      statusCode: response.status,
      url
    });
  }

  let browserCheck: SmokeContractResult['browserCheck'];

  if (input.usePlaywright) {
    const browserPath = normalizePath(input.browserPath ?? '/');
    const browserUrl = new URL(browserPath, `${baseUrl}/`).toString();
    const result = await runPlaywrightCheck(browserUrl);

    browserCheck = {
      notes: result.notes,
      path: browserPath,
      result: result.passed ? 'passed' : 'failed'
    };
  } else {
    browserCheck = {
      notes: ['Playwright smoke was not requested.'],
      path: normalizePath(input.browserPath ?? '/'),
      result: 'skipped'
    };
  }

  const passed =
    routeCheckResults.every((routeCheckResult) => routeCheckResult.result === 'passed') &&
    browserCheck.result !== 'failed';

  notes.push(
    passed
      ? 'Smoke contract passed.'
      : 'Smoke contract detected at least one failed route or browser check.'
  );

  return {
    browserCheck,
    notes,
    passed,
    routeChecks: routeCheckResults
  };
}
