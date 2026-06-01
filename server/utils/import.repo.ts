import { and, eq, inArray } from 'drizzle-orm'
import { leads, statuses } from '~~/server/db/schema'
import {
  toDraft, normalizeDraft, markInBatchDupes,
  type ColumnMap, type AnnotatedRow,
} from '~~/shared/utils/import'
import { bulkCreateLeads } from './leads.repo'
import type { RequestContext } from './context'

/** Build fully-annotated rows: normalize, in-batch dupes, existing-workspace dupes, status-by-label. */
export async function annotateRows(
  ctx: RequestContext,
  rows: string[][],
  map: ColumnMap,
): Promise<AnnotatedRow[]> {
  const db = useDb()

  const annotated: AnnotatedRow[] = rows.map((row, index) => {
    const n = normalizeDraft(toDraft(row, map))
    return { index, ...n, statusId: null, duplicate: null }
  })

  markInBatchDupes(annotated)

  const phones = [...new Set(annotated.filter((r) => r.phoneE164).map((r) => r.phoneE164!))]
  if (phones.length) {
    const existing = await db.select({ p: leads.phoneE164 }).from(leads)
      .where(and(eq(leads.workspaceId, ctx.workspaceId), inArray(leads.phoneE164, phones)))
    const existingSet = new Set(existing.map((e) => e.p))
    for (const r of annotated) {
      if (r.phoneE164 && r.duplicate === null && existingSet.has(r.phoneE164)) r.duplicate = 'existing'
    }
  }

  const wsStatuses = await db.select().from(statuses).where(eq(statuses.workspaceId, ctx.workspaceId))
  const byLabel = new Map(wsStatuses.map((s) => [s.label.toLowerCase(), s.id]))
  for (const r of annotated) {
    r.statusId = r.statusLabel ? (byLabel.get(r.statusLabel.toLowerCase()) ?? null) : null
  }

  return annotated
}

export interface CommitResult { inserted: number; skipped: number }

/** Insert valid rows. Always skip in-batch repeats; skip existing dupes unless includeDuplicates. */
export async function commitRows(
  ctx: RequestContext,
  rows: string[][],
  map: ColumnMap,
  includeDuplicates: boolean,
): Promise<CommitResult> {
  const annotated = await annotateRows(ctx, rows, map)
  const toInsert = annotated.filter((r) =>
    r.valid && r.duplicate !== 'in-batch' && (includeDuplicates || r.duplicate !== 'existing'),
  )
  const inserted = await bulkCreateLeads(ctx, toInsert.map((r) => ({
    name: r.name,
    phoneE164: r.phoneE164,
    phoneRaw: r.phoneRaw || null,
    phoneValid: r.phoneValid,
    area: r.area,
    statusId: r.statusId,
    remarks: r.remarks,
  })))
  return { inserted, skipped: annotated.length - inserted }
}
