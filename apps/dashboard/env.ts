import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvConfig } from '@next/env';

const dashboardProjectRoot = path.dirname(fileURLToPath(import.meta.url));

export const dashboardWorkspaceRoot = path.resolve(
  dashboardProjectRoot,
  '../..'
);

let dashboardEnvLoaded = false;

export function loadDashboardEnv() {
  if (dashboardEnvLoaded) {
    return;
  }

  loadEnvConfig(dashboardWorkspaceRoot);
  dashboardEnvLoaded = true;
}
