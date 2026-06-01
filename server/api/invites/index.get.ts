import { listPendingInvites } from '~~/server/utils/invites.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  return listPendingInvites(ctx)
})
