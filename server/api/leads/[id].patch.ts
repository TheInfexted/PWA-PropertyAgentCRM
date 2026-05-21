import { leadPatchSchema } from '~~/shared/schemas/lead'
import { getLead, updateLead } from '~~/server/utils/leads.repo'
import { logActivity } from '~~/server/utils/activities.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const id = Number(getRouterParam(event, 'id'))
  const data = leadPatchSchema.parse(await readBody(event))

  const before = await getLead(ctx, id)
  if (!before) throw createError({ statusCode: 404, message: 'Lead not found' })

  const lead = await updateLead(ctx, id, data)
  if (lead && data.statusId !== undefined && data.statusId !== before.statusId) {
    await logActivity(ctx, id, 'status_change', { from: before.statusId, to: data.statusId })
  }
  if (lead && data.assignedTo !== undefined && data.assignedTo !== before.assignedTo) {
    await logActivity(ctx, id, 'assigned', { to: data.assignedTo })
  }
  return lead
})
