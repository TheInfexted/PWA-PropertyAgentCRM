import { memberPasswordSchema } from '~~/shared/schemas/member'
import { setMemberPassword } from '~~/server/utils/members.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const userId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(userId) || userId <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  const { newPassword } = memberPasswordSchema.parse(await readBody(event))
  await setMemberPassword(ctx, userId, newPassword)
  return { ok: true }
})
