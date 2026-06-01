import { listMembers } from '~~/server/utils/members.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  return listMembers(ctx)
})
