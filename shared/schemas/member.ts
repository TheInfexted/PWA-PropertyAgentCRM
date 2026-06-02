import { z } from 'zod'

export const memberRoleSchema = z.object({ role: z.enum(['owner', 'agent']) })
export const memberPasswordSchema = z.object({ newPassword: z.string().min(8).max(200) })

export type MemberRole = z.infer<typeof memberRoleSchema>
