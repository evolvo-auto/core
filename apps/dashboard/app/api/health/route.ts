import { buildDashboardHealth } from '../../lib/build-dashboard-health';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(buildDashboardHealth());
}
