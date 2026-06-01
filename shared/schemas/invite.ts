import { z } from 'zod'

export const createInviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.literal('agent').default('agent'),
})

export const acceptInviteSchema = z.object({
  token: z.string().min(10).max(128),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(200),
})

export type CreateInvite = z.infer<typeof createInviteSchema>

/** Build the public accept URL for an invite token. */
export function inviteLink(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/invite/${token}`
}
