import { listActivities } from '~~/server/utils/activities.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const id = Number(getRouterParam(event, 'id'))
  return listActivities(ctx, id)
})
