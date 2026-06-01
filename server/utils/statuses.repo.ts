import { and, asc, eq } from 'drizzle-orm'
import { statuses, leads } from '~~/server/db/schema'
import type { RequestContext } from './context'
import { nextSortOrder, type StatusCreate, type StatusUpdate } from '~~/shared/schemas/status'

export async function listStatuses(ctx: RequestContext) {
  const db = useDb()
  return db.select().from(statuses)
    .where(eq(statuses.workspaceId, ctx.workspaceId))
    .orderBy(asc(statuses.sortOrder))
}

export async function createStatus(ctx: RequestContext, data: StatusCreate) {
  const db = useDb()
  const existing = await db.select({ sortOrder: statuses.sortOrder }).from(statuses)
    .where(eq(statuses.workspaceId, ctx.workspaceId))
  const [res] = await db.insert(statuses).values({
    workspaceId: ctx.workspaceId,
    label: data.label,
    color: data.color,
    sortOrder: nextSortOrder(existing),
  })
  const [row] = await db.select().from(statuses)
    .where(and(eq(statuses.workspaceId, ctx.workspaceId), eq(statuses.id, res.insertId))).limit(1)
  return row ?? null
}

export async function updateStatus(ctx: RequestContext, id: number, patch: StatusUpdate) {
  const db = useDb()
  await db.update(statuses).set(patch)
    .where(and(eq(statuses.workspaceId, ctx.workspaceId), eq(statuses.id, id)))
  const [row] = await db.select().from(statuses)
    .where(and(eq(statuses.workspaceId, ctx.workspaceId), eq(statuses.id, id))).limit(1)
  return row ?? null
}

/** Delete a status; leads using it fall back to no status. */
export async function deleteStatus(ctx: RequestContext, id: number) {
  const db = useDb()
  await db.update(leads).set({ statusId: null })
    .where(and(eq(leads.workspaceId, ctx.workspaceId), eq(leads.statusId, id)))
  await db.delete(statuses)
    .where(and(eq(statuses.workspaceId, ctx.workspaceId), eq(statuses.id, id)))
}

/** Set sortOrder = position in `ids` for each status in this workspace. */
export async function reorderStatuses(ctx: RequestContext, ids: number[]) {
  const db = useDb()
  for (let i = 0; i < ids.length; i++) {
    await db.update(statuses).set({ sortOrder: i })
      .where(and(eq(statuses.workspaceId, ctx.workspaceId), eq(statuses.id, ids[i]!)))
  }
}
