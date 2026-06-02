import { memberRoleSchema } from '~~/shared/schemas/member'
import { changeMemberRole } from '~~/server/utils/members.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const userId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(userId) || userId <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  const { role } = memberRoleSchema.parse(await readBody(event))
  await changeMemberRole(ctx, userId, role)
  return { ok: true }
})
