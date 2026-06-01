import { statusUpdateSchema } from '~~/shared/schemas/status'
import { updateStatus } from '~~/server/utils/statuses.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  const patch = statusUpdateSchema.parse(await readBody(event))
  const row = await updateStatus(ctx, id, patch)
  if (!row) throw createError({ statusCode: 404, message: 'Status not found' })
  return row
})
