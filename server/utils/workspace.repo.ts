import { eq } from 'drizzle-orm'
import { workspaces } from '~~/server/db/schema'
import type { RequestContext } from './context'
import type { WorkspaceSettings } from '~~/shared/types'

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

export async function updateWorkspace(ctx: RequestContext, patch: { name?: string; settings?: WorkspaceSettings }) {
  const db = useDb()
  const set: Partial<typeof workspaces.$inferInsert> = {}
  if (patch.name !== undefined) set.name = patch.name
  if (patch.settings !== undefined) set.settings = patch.settings
  if (Object.keys(set).length) {
    await db.update(workspaces).set(set).where(eq(workspaces.id, ctx.workspaceId))
  }
  return getWorkspace(ctx)
}
