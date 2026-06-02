import { accountUpdateSchema } from '~~/shared/schemas/account'
import { updateAccount } from '~~/server/utils/account.repo'
import { buildSessionPayload } from '~~/server/utils/session-payload'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const patch = accountUpdateSchema.parse(await readBody(event))
  const account = await updateAccount(ctx.userId, patch)
  if (!account) throw createError({ statusCode: 404, message: 'Account not found' })
  // Re-issue the session so a renamed user shows immediately. Avatar is NOT stored in the
  // cookie (size) — the client fetches it via GET /api/account.
  if (patch.name !== undefined) {
    await setUserSession(event, {
      ...buildSessionPayload(
        { id: account.id, email: account.email, name: account.name },
        { workspaceId: ctx.workspaceId, role: ctx.role },
      ),
    })
  }
  return { ...account, role: ctx.role }
})
