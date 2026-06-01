import { eq } from 'drizzle-orm'
import { workspaces } from '~~/server/db/schema'
import type { RequestContext } from './context'

export async function getWorkspace(ctx: RequestContext) {
  const db = useDb()
  const [row] = await db.select().from(workspaces).where(eq(workspaces.id, ctx.workspaceId)).limit(1)
  return row ?? null
}

export async function renameWorkspace(ctx: RequestContext, name: string) {
  const db = useDb()
  await db.update(workspaces).set({ name }).where(eq(workspaces.id, ctx.workspaceId))
  return getWorkspace(ctx)
}
