import { bulkActionSchema } from '~~/shared/schemas/lead'
import { bulkAssign, bulkSetStatus, bulkDelete } from '~~/server/utils/leads.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const body = bulkActionSchema.parse(await readBody(event))
  if (body.action === 'assign') {
    requireOwner(ctx)
    if (body.assignedTo == null) throw createError({ statusCode: 400, message: 'assignedTo required' })
    return { ok: true, affected: await bulkAssign(ctx, body.ids, body.assignedTo) }
  }
  if (body.action === 'status') {
    return { ok: true, affected: await bulkSetStatus(ctx, body.ids, body.statusId ?? null) }
  }
  return { ok: true, affected: await bulkDelete(ctx, body.ids) }
})
