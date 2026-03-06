import { buildFailureMemorySnapshot } from '../../lib/build-failure-memory-snapshot';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await buildFailureMemorySnapshot());
}
