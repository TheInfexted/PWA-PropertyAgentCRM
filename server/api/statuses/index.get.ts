import { listStatuses } from '~~/server/utils/statuses.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  return listStatuses(ctx)
})
