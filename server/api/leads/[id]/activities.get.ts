import { getLead } from '~~/server/utils/leads.repo'
import { listActivities } from '~~/server/utils/activities.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  const lead = await getLead(ctx, id)
  if (!lead) throw createError({ statusCode: 404, message: 'Lead not found' })
  return listActivities(ctx, id)
})
