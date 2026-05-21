import { and, desc, eq } from 'drizzle-orm'
import { activities } from '~~/server/db/schema'
import type { ActivityType } from '~~/shared/types'
import type { RequestContext } from './context'

export async function logActivity(
  ctx: RequestContext,
  leadId: number,
  type: ActivityType,
  detail?: Record<string, unknown>,
) {
  const db = useDb()
  await db.insert(activities).values({
    workspaceId: ctx.workspaceId, leadId, type, detail: detail ?? null, actorUserId: ctx.userId,
  })
}

export async function listActivities(ctx: RequestContext, leadId: number) {
  const db = useDb()
  return db.select().from(activities)
    .where(and(eq(activities.workspaceId, ctx.workspaceId), eq(activities.leadId, leadId)))
    .orderBy(desc(activities.createdAt))
    .limit(200)
}
