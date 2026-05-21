import { asc, eq } from 'drizzle-orm'
import { statuses } from '~~/server/db/schema'
import type { RequestContext } from './context'

export async function listStatuses(ctx: RequestContext) {
  const db = useDb()
  return db.select().from(statuses)
    .where(eq(statuses.workspaceId, ctx.workspaceId))
    .orderBy(asc(statuses.sortOrder))
}
