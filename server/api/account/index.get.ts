import { getAccount } from '~~/server/utils/account.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const account = await getAccount(ctx.userId)
  if (!account) throw createError({ statusCode: 404, message: 'Account not found' })
  return { ...account, role: ctx.role }
})
