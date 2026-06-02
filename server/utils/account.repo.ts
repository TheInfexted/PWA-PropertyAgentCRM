import { eq } from 'drizzle-orm'
import { users } from '~~/server/db/schema'

export async function getAccount(userId: number) {
  const db = useDb()
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, avatar: users.avatar })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row ?? null
}

export async function updateAccount(userId: number, patch: { name?: string; avatar?: string | null }) {
  const db = useDb()
  const set: Partial<typeof users.$inferInsert> = {}
  if (patch.name !== undefined) set.name = patch.name
  if (patch.avatar !== undefined) set.avatar = patch.avatar
  if (Object.keys(set).length) {
    await db.update(users).set(set).where(eq(users.id, userId))
  }
  return getAccount(userId)
}

/** Verifies the current password, then sets the new one. Returns false if the current password is wrong. */
export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
  const db = useDb()
  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1)
  if (!row) return false
  if (!(await verifyPassword(row.passwordHash, currentPassword))) return false
  const passwordHash = await hashPassword(newPassword)
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId))
  return true
}
