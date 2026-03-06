import { buildPlatformHealthSnapshot } from '../../lib/build-platform-health-snapshot';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await buildPlatformHealthSnapshot());
}
