import { listDueFollowUps } from '~~/server/utils/leads.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  return listDueFollowUps(ctx)
})
