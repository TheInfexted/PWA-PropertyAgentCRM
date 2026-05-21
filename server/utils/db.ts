import { drizzle } from 'drizzle-orm/mysql2'
import * as schema from '~~/server/db/schema'

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined

export function useDb() {
  if (!dbInstance) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    dbInstance = drizzle(url, { schema, mode: 'default' })
  }
  return dbInstance
}
