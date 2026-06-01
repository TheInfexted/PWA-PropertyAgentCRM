import { statusCreateSchema } from '~~/shared/schemas/status'
import { createStatus } from '~~/server/utils/statuses.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const data = statusCreateSchema.parse(await readBody(event))
  return createStatus(ctx, data)
})
