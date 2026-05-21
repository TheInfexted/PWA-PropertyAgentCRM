import { getLead, deleteLead } from '~~/server/utils/leads.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  const existing = await getLead(ctx, id)
  if (!existing) throw createError({ statusCode: 404, message: 'Lead not found' })
  await deleteLead(ctx, id)
  return { ok: true }
})
