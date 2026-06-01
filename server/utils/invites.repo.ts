import { randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { invites, users, workspaceMembers, workspaces } from '~~/server/db/schema'
import { buildSessionPayload, type SessionPayload } from './session-payload'
import type { RequestContext } from './context'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function createInvite(ctx: RequestContext, email: string) {
  const db = useDb()
  const token = randomBytes(24).toString('hex')
  await db.insert(invites).values({
    workspaceId: ctx.workspaceId,
    email,
    role: 'agent',
    token,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  })
  return { token, email }
}

export async function listPendingInvites(ctx: RequestContext) {
  const db = useDb()
  return db
    .select({ id: invites.id, email: invites.email, role: invites.role, createdAt: invites.createdAt })
    .from(invites)
    .where(and(eq(invites.workspaceId, ctx.workspaceId), isNull(invites.acceptedAt), gt(invites.expiresAt, new Date())))
}

export async function revokeInvite(ctx: RequestContext, id: number) {
  const db = useDb()
  await db.delete(invites)
    .where(and(eq(invites.workspaceId, ctx.workspaceId), eq(invites.id, id), isNull(invites.acceptedAt)))
}

export async function getInviteByToken(token: string) {
  const db = useDb()
  const [row] = await db
    .select({ id: invites.id, email: invites.email, role: invites.role, workspaceId: invites.workspaceId, workspaceName: workspaces.name })
    .from(invites)
    .innerJoin(workspaces, eq(workspaces.id, invites.workspaceId))
    .where(and(eq(invites.token, token), isNull(invites.acceptedAt), gt(invites.expiresAt, new Date())))
    .limit(1)
  return row ?? null
}

export async function acceptInvite(token: string, name: string, password: string): Promise<SessionPayload | null> {
  const db = useDb()
  const invite = await getInviteByToken(token)
  if (!invite) return null

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, invite.email)).limit(1)
  if (existing) throw createError({ statusCode: 409, message: 'An account already exists for this email' })

  const passwordHash = await hashPassword(password)
  const [u] = await db.insert(users).values({ email: invite.email, passwordHash, name })
  const userId = u.insertId

  await db.insert(workspaceMembers).values({ workspaceId: invite.workspaceId, userId, role: invite.role })
  await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id))

  return buildSessionPayload(
    { id: userId, email: invite.email, name },
    { workspaceId: invite.workspaceId, role: invite.role },
  )
}
