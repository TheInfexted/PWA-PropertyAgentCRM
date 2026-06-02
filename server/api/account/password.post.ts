import { passwordChangeSchema } from '~~/shared/schemas/account'
import { changePassword } from '~~/server/utils/account.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const { currentPassword, newPassword } = passwordChangeSchema.parse(await readBody(event))
  const ok = await changePassword(ctx.userId, currentPassword, newPassword)
  if (!ok) throw createError({ statusCode: 400, message: 'Current password is incorrect' })
  return { ok: true }
})
