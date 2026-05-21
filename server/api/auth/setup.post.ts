import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { users, workspaces, workspaceMembers, statuses } from '~~/server/db/schema'
import { DEFAULT_STATUS_LABELS, DEFAULT_STATUS_COLORS } from '~~/shared/defaults'
import { DEFAULT_WORKSPACE_SETTINGS } from '~~/shared/types'
import { buildSessionPayload } from '~~/server/utils/session-payload'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  workspaceName: z.string().trim().min(1).max(160),
})

export default defineEventHandler(async (event) => {
  const db = useDb()!
  const rows = await db.select({ count: sql<number>`count(*)` }).from(users)
  const count = rows[0]?.count ?? 0
  if (Number(count) > 0) {
    throw createError({ statusCode: 409, message: 'Setup already completed' })
  }
  const body = bodySchema.parse(await readBody(event))

  const passwordHash = await hashPassword(body.password)
  const [userRes] = await db.insert(users).values({
    email: body.email, passwordHash, name: body.name,
  })
  const userId = userRes.insertId

  const [wsRes] = await db.insert(workspaces).values({
    name: body.workspaceName, settings: DEFAULT_WORKSPACE_SETTINGS,
  })
  const workspaceId = wsRes.insertId

  await db.insert(workspaceMembers).values({ workspaceId, userId, role: 'owner' })
  await db.insert(statuses).values(
    DEFAULT_STATUS_LABELS.map((label, i) => ({
      workspaceId, label, color: DEFAULT_STATUS_COLORS[label] ?? '#6b7280', sortOrder: i,
    })),
  )

  const payload = buildSessionPayload(
    { id: userId, email: body.email, name: body.name },
    { workspaceId, role: 'owner' },
  )
  await setUserSession(event, { ...payload })
  return { ok: true }
})
