import { createInviteSchema } from '~~/shared/schemas/invite'
import { createInvite } from '~~/server/utils/invites.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const { email } = createInviteSchema.parse(await readBody(event))
  return createInvite(ctx, email)
})
