import { buildBenchmarkSnapshot } from '../../lib/build-benchmark-snapshot';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await buildBenchmarkSnapshot());
}
