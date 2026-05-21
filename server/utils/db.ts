import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from '~~/server/db/schema'

let pool: mysql.Pool | null = null
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  if (dbInstance) return dbInstance
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  pool = mysql.createPool(url)
  dbInstance = drizzle(pool, { schema, mode: 'default' })
  return dbInstance
}
