import { getWorkspace } from '~~/server/utils/workspace.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  return getWorkspace(ctx)
})
