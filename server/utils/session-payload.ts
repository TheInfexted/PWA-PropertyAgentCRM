import type { Role } from '~~/shared/types'

export interface SessionUser {
  id: number
  email: string
  name: string
}

export interface SessionPayload {
  user: SessionUser
  workspaceId: number
  role: Role
}

export function buildSessionPayload(
  user: SessionUser,
  ctx: { workspaceId: number; role: Role },
): SessionPayload {
  return { user, workspaceId: ctx.workspaceId, role: ctx.role }
}
