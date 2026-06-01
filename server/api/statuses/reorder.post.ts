import { reorderSchema } from '~~/shared/schemas/status'
import { reorderStatuses } from '~~/server/utils/statuses.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const { ids } = reorderSchema.parse(await readBody(event))
  await reorderStatuses(ctx, ids)
  return { ok: true }
})
