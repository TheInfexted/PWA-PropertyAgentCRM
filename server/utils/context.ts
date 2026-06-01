import type { H3Event } from 'h3'
import type { Role } from '~~/shared/types'
import type { SessionPayload } from './session-payload'

export interface RequestContext {
  userId: number
  workspaceId: number
  role: Role
}

export function contextFromSession(session: Partial<SessionPayload>): RequestContext {
  const userId = Number(session?.user?.id)
  const workspaceId = Number(session?.workspaceId)
  const role = session?.role as Role | undefined
  if (!userId || !workspaceId || (role !== 'owner' && role !== 'agent')) {
    throw createError({ statusCode: 401, message: 'No workspace context' })
  }
  return { userId, workspaceId, role }
}

export async function requireContext(event: H3Event): Promise<RequestContext> {
  const session = await requireUserSession(event)
  return contextFromSession(session as unknown as Partial<SessionPayload>)
}

export function requireOwner(ctx: RequestContext) {
  if (ctx.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Only the workspace owner can do that' })
  }
}
