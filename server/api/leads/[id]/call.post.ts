import { z } from 'zod'
import { getLead, updateLead } from '~~/server/utils/leads.repo'
import { logActivity } from '~~/server/utils/activities.repo'

const bodySchema = z.object({ statusId: z.number().int().positive().nullable().optional() })

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  const lead = await getLead(ctx, id)
  if (!lead) throw createError({ statusCode: 404, message: 'Lead not found' })
  const body = bodySchema.parse(await readBody(event).catch(() => ({})))
  await logActivity(ctx, id, 'call', body.statusId ? { statusId: body.statusId } : undefined)
  if (body.statusId !== undefined && body.statusId !== null) {
    await updateLead(ctx, id, { statusId: body.statusId })
  }
  return { ok: true }
})
