import { acceptInviteSchema } from '~~/shared/schemas/invite'
import { acceptInvite } from '~~/server/utils/invites.repo'

export default defineEventHandler(async (event) => {
  const { token, name, password } = acceptInviteSchema.parse(await readBody(event))
  const session = await acceptInvite(token, name, password)
  if (!session) throw createError({ statusCode: 400, message: 'This invite is invalid or has expired' })
  await setUserSession(event, { ...session })
  return { ok: true }
})
