import 'dotenv/config'
import { drizzle } from 'drizzle-orm/mysql2'
import { eq } from 'drizzle-orm'
import * as schema from './schema'
import { normalizePhone } from '../../shared/utils/phone'

const SAMPLE = [
  { name: 'Dean Cheong', phone: '60128975215', area: 'Petaling Jaya' },
  { name: 'Evelyn Khoo', phone: '601162085300', area: 'Klang' },
  { name: 'Patrick Ee', phone: '60123498895', area: 'Petaling Jaya' },
  { name: 'Loh Lan', phone: '60162860969', area: 'Shah Alam' },
]

async function main() {
  const db = drizzle(process.env.DATABASE_URL!, { schema, mode: 'default' })
  const [ws] = await db.select().from(schema.workspaces).limit(1)
  if (!ws) { console.log('Run first-run setup in the app before seeding.'); process.exit(1) }
  const [firstStatus] = await db.select().from(schema.statuses).where(eq(schema.statuses.workspaceId, ws.id)).limit(1)
  const [owner] = await db.select().from(schema.workspaceMembers).where(eq(schema.workspaceMembers.workspaceId, ws.id)).limit(1)
  for (const s of SAMPLE) {
    const p = normalizePhone(s.phone)
    await db.insert(schema.leads).values({
      workspaceId: ws.id, name: s.name, area: s.area,
      phoneRaw: p.raw, phoneE164: p.e164, phoneValid: p.valid,
      statusId: firstStatus?.id ?? null, source: 'manual',
      assignedTo: owner?.userId ?? null,
      createdBy: owner?.userId ?? null,
    })
  }
  console.log(`Seeded ${SAMPLE.length} leads into workspace ${ws.id}`)
  process.exit(0)
}
main()
