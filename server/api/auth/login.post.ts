import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users, workspaceMembers } from '~~/server/db/schema'
import { buildSessionPayload } from '~~/server/utils/session-payload'

const bodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const db = useDb()!
  const { email, password } = bodySchema.parse(await readBody(event))

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw createError({ statusCode: 401, message: 'Invalid email or password' })
  }

  const [member] = await db.select().from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id)).limit(1)
  if (!member) {
    throw createError({ statusCode: 403, message: 'No workspace for this account' })
  }

  const payload = buildSessionPayload(
    { id: user.id, email: user.email, name: user.name },
    { workspaceId: member.workspaceId, role: member.role },
  )
  await setUserSession(event, { ...payload })
  return { ok: true }
})
