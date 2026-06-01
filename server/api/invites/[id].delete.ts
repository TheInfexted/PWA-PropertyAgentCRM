import { revokeInvite } from '~~/server/utils/invites.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  await revokeInvite(ctx, id)
  return { ok: true }
})
