import { buildWorktreeSnapshot } from '../../lib/build-worktree-snapshot';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await buildWorktreeSnapshot());
}
