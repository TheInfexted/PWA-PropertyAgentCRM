import { and, eq, sql } from 'drizzle-orm'
import { workspaceMembers, users, leads } from '~~/server/db/schema'
import type { RequestContext } from './context'

export async function listMembers(ctx: RequestContext) {
  const db = useDb()
  return db
    .select({ userId: users.id, name: users.name, email: users.email, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, ctx.workspaceId))
}

async function ownerCount(ctx: RequestContext): Promise<number> {
  const db = useDb()
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ctx.workspaceId), eq(workspaceMembers.role, 'owner')))
  return Number(r?.n ?? 0)
}

async function getMembership(ctx: RequestContext, userId: number) {
  const db = useDb()
  const [m] = await db.select().from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ctx.workspaceId), eq(workspaceMembers.userId, userId))).limit(1)
  return m ?? null
}

export async function changeMemberRole(ctx: RequestContext, userId: number, role: 'owner' | 'agent') {
  const db = useDb()
  const m = await getMembership(ctx, userId)
  if (!m) throw createError({ statusCode: 404, message: 'Member not found' })
  if (m.role === 'owner' && role === 'agent' && (await ownerCount(ctx)) <= 1) {
    throw createError({ statusCode: 400, message: 'The workspace must keep at least one owner' })
  }
  await db.update(workspaceMembers).set({ role })
    .where(and(eq(workspaceMembers.workspaceId, ctx.workspaceId), eq(workspaceMembers.userId, userId)))
}

/** Reassign the member's leads to the acting owner, then remove their membership (transactional). */
export async function removeMember(ctx: RequestContext, userId: number) {
  if (userId === ctx.userId) throw createError({ statusCode: 400, message: "You can't remove yourself" })
  const m = await getMembership(ctx, userId)
  if (!m) throw createError({ statusCode: 404, message: 'Member not found' })
  if (m.role === 'owner' && (await ownerCount(ctx)) <= 1) {
    throw createError({ statusCode: 400, message: 'The workspace must keep at least one owner' })
  }
  const db = useDb()
  await db.transaction(async (tx) => {
    await tx.update(leads).set({ assignedTo: ctx.userId })
      .where(and(eq(leads.workspaceId, ctx.workspaceId), eq(leads.assignedTo, userId)))
    await tx.delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, ctx.workspaceId), eq(workspaceMembers.userId, userId)))
  })
}

export async function setMemberPassword(ctx: RequestContext, userId: number, newPassword: string) {
  const m = await getMembership(ctx, userId)
  if (!m) throw createError({ statusCode: 404, message: 'Member not found' })
  const passwordHash = await hashPassword(newPassword)
  const db = useDb()
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId))
}
