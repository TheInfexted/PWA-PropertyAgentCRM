import { z } from 'zod'
import { renameWorkspace } from '~~/server/utils/workspace.repo'

const bodySchema = z.object({ name: z.string().trim().min(1).max(160) })

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const { name } = bodySchema.parse(await readBody(event))
  return renameWorkspace(ctx, name)
})
