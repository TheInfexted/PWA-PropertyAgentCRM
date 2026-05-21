import type { Role } from '~~/shared/types'

export interface VisibilityContext {
  workspaceId: number
  role: Role
  userId: number
}

export interface LeadScope {
  workspaceId: number
  assignedTo?: number
}

/** The entire "agent sees own / owner sees all" rule. Used by every leads query. */
export function leadVisibilityScope(ctx: VisibilityContext): LeadScope {
  if (ctx.role === 'agent') {
    return { workspaceId: ctx.workspaceId, assignedTo: ctx.userId }
  }
  return { workspaceId: ctx.workspaceId }
}
