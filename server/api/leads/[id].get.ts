import { getLead } from '~~/server/utils/leads.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const id = Number(getRouterParam(event, 'id'))
  const lead = await getLead(ctx, id)
  if (!lead) throw createError({ statusCode: 404, message: 'Lead not found' })
  return lead
})
