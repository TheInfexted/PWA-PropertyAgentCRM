import { workspacePatchSchema } from '~~/shared/schemas/workspace'
import { updateWorkspace } from '~~/server/utils/workspace.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const patch = workspacePatchSchema.parse(await readBody(event))
  return updateWorkspace(ctx, patch)
})
