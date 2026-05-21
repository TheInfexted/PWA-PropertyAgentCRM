import { sql } from 'drizzle-orm'
import { users } from '~~/server/db/schema'

export default defineEventHandler(async () => {
  const db = useDb()!
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
  const count = rows[0]?.count ?? 0
  return { needsSetup: Number(count) === 0 }
})
