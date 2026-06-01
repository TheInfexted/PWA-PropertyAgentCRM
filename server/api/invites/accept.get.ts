import { getInviteByToken } from '~~/server/utils/invites.repo'

export default defineEventHandler(async (event) => {
  const token = String(getQuery(event).token ?? '')
  const invite = await getInviteByToken(token)
  if (!invite) throw createError({ statusCode: 404, message: 'This invite is invalid or has expired' })
  return { email: invite.email, workspaceName: invite.workspaceName }
})
