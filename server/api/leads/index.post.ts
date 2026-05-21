import { leadInputSchema } from '~~/shared/schemas/lead'
import { createLead } from '~~/server/utils/leads.repo'
import { logActivity } from '~~/server/utils/activities.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const data = leadInputSchema.parse(await readBody(event))
  const lead = await createLead(ctx, data)
  if (lead) await logActivity(ctx, lead.id, 'created')
  return lead
})
