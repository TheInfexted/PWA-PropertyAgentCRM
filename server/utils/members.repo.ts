import { eq } from 'drizzle-orm'
import { workspaceMembers, users } from '~~/server/db/schema'
import type { RequestContext } from './context'

export async function listMembers(ctx: RequestContext) {
  const db = useDb()
  return db
    .select({ userId: users.id, name: users.name, email: users.email, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, ctx.workspaceId))
}
