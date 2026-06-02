import { and, asc, desc, eq, gte, inArray, isNotNull, like, or, sql } from 'drizzle-orm'
import { leads, activities, statuses } from '~~/server/db/schema'
import { leadVisibilityScope, type VisibilityContext } from '~~/shared/utils/visibility'
import { normalizePhone } from '~~/shared/utils/phone'
import type { LeadInput } from '~~/shared/schemas/lead'
import type { RequestContext } from './context'

export interface LeadListFilters {
  statusId?: number
  area?: string
  assignedTo?: number
  search?: string
  dueOnly?: boolean
}

export interface WherePart { col: 'workspaceId' | 'assignedTo' | 'statusId' | 'area'; value: number | string }

/** Pure, testable: derives the equality where-parts from visibility + filters. */
export function buildLeadWhereParts(ctx: VisibilityContext, filters: LeadListFilters): WherePart[] {
  const scope = leadVisibilityScope(ctx)
  const parts: WherePart[] = [{ col: 'workspaceId', value: scope.workspaceId }]
  if (scope.assignedTo !== undefined) parts.push({ col: 'assignedTo', value: scope.assignedTo })
  if (filters.assignedTo !== undefined && ctx.role === 'owner') {
    parts.push({ col: 'assignedTo', value: filters.assignedTo })
  }
  if (filters.statusId !== undefined) parts.push({ col: 'statusId', value: filters.statusId })
  if (filters.area) parts.push({ col: 'area', value: filters.area })
  return parts
}

const COL = { workspaceId: leads.workspaceId, assignedTo: leads.assignedTo, statusId: leads.statusId, area: leads.area }

function whereFor(ctx: VisibilityContext, filters: LeadListFilters) {
  const conds = buildLeadWhereParts(ctx, filters).map((p) => eq(COL[p.col], p.value as never))
  if (filters.search) {
    const q = `%${filters.search}%`
    conds.push(or(like(leads.name, q), like(leads.phoneE164, q), like(leads.phoneRaw, q))!)
  }
  if (filters.dueOnly) {
    conds.push(isNotNull(leads.nextFollowUpAt))
    conds.push(sql`date(${leads.nextFollowUpAt}) <= curdate()`)
  }
  return and(...conds)
}

export interface ListOpts extends LeadListFilters {
  page?: number
  pageSize?: number
  sort?: 'name' | 'createdAt' | 'area'
  dir?: 'asc' | 'desc'
}

export async function listLeads(ctx: RequestContext, opts: ListOpts) {
  const db = useDb()
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50))
  const where = whereFor(ctx, opts)
  const sortCol = opts.sort === 'name' ? leads.name : opts.sort === 'area' ? leads.area : leads.createdAt
  const order = opts.dir === 'asc' ? asc(sortCol) : desc(sortCol)

  const rows = await db.select().from(leads).where(where).orderBy(order)
    .limit(pageSize).offset((page - 1) * pageSize)
  const countResult = await db.select({ total: sql<number>`count(*)` }).from(leads).where(where)
  const total = countResult[0]?.total ?? 0
  return { rows, total: Number(total), page, pageSize }
}

export async function getLead(ctx: RequestContext, id: number) {
  const db = useDb()
  const [row] = await db.select().from(leads)
    .where(and(whereFor(ctx, {}), eq(leads.id, id))).limit(1)
  return row ?? null
}

function applyPhone<T extends { phone?: string }>(data: T) {
  const p = normalizePhone(data.phone ?? '')
  return { phoneRaw: p.raw || null, phoneE164: p.e164, phoneValid: p.valid }
}

/** Throws 400 if statusId is set but does not belong to the caller's workspace. */
async function assertStatusInWorkspace(ctx: RequestContext, statusId: number | null | undefined) {
  if (statusId == null) return
  const db = useDb()
  const [s] = await db.select({ id: statuses.id }).from(statuses)
    .where(and(eq(statuses.workspaceId, ctx.workspaceId), eq(statuses.id, statusId))).limit(1)
  if (!s) throw createError({ statusCode: 400, message: 'Invalid status for this workspace' })
}

export async function createLead(ctx: RequestContext, data: LeadInput) {
  const db = useDb()
  await assertStatusInWorkspace(ctx, data.statusId)
  const phone = applyPhone(data)
  const [res] = await db.insert(leads).values({
    workspaceId: ctx.workspaceId,
    name: data.name ?? '',
    area: data.area ?? '',
    remarks: data.remarks ?? '',
    statusId: data.statusId ?? null,
    assignedTo: ctx.role === 'owner' ? (data.assignedTo ?? ctx.userId) : ctx.userId,
    email: data.email || null,
    intent: data.intent ?? null,
    propertyType: data.propertyType ?? null,
    budgetMin: data.budgetMin ?? null,
    budgetMax: data.budgetMax ?? null,
    nextFollowUpAt: data.nextFollowUpAt ? data.nextFollowUpAt.slice(0, 10) : null,
    tags: data.tags ?? [],
    source: 'manual',
    createdBy: ctx.userId,
    ...phone,
  })
  return getLead(ctx, res.insertId)
}

export async function updateLead(ctx: RequestContext, id: number, data: Partial<LeadInput>) {
  const db = useDb()
  const existing = await getLead(ctx, id)
  if (!existing) return null
  if (data.statusId !== undefined) await assertStatusInWorkspace(ctx, data.statusId)
  const patch: Partial<typeof leads.$inferInsert> = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.area !== undefined) patch.area = data.area
  if (data.remarks !== undefined) patch.remarks = data.remarks
  if (data.statusId !== undefined) patch.statusId = data.statusId
  if (data.assignedTo !== undefined && ctx.role === 'owner') patch.assignedTo = data.assignedTo
  if (data.nextFollowUpAt !== undefined) patch.nextFollowUpAt = data.nextFollowUpAt ? data.nextFollowUpAt.slice(0, 10) : null
  if (data.email !== undefined) patch.email = data.email || null
  if (data.intent !== undefined) patch.intent = data.intent ?? null
  if (data.propertyType !== undefined) patch.propertyType = data.propertyType ?? null
  if (data.budgetMin !== undefined) patch.budgetMin = data.budgetMin ?? null
  if (data.budgetMax !== undefined) patch.budgetMax = data.budgetMax ?? null
  if (data.tags !== undefined) patch.tags = data.tags
  if (data.phone !== undefined) Object.assign(patch, applyPhone(data as { phone?: string }))
  await db.update(leads).set(patch).where(and(whereFor(ctx, {}), eq(leads.id, id)))
  return getLead(ctx, id)
}

export async function deleteLead(ctx: RequestContext, id: number) {
  const db = useDb()
  await db.delete(leads).where(and(whereFor(ctx, {}), eq(leads.id, id)))
}

export interface ImportLeadValues {
  name: string
  phoneE164: string | null
  phoneRaw: string | null
  phoneValid: boolean
  area: string
  statusId: number | null
  remarks: string
}

/** Bulk-insert imported leads + one 'imported' activity each. Returns count inserted. */
/** Leads with a follow-up due today or overdue (visibility-scoped), oldest first. */
export async function listDueFollowUps(ctx: RequestContext) {
  const db = useDb()
  const where = and(
    whereFor(ctx, {}),
    isNotNull(leads.nextFollowUpAt),
    sql`${leads.nextFollowUpAt} <= curdate()`,
  )
  return db.select().from(leads).where(where).orderBy(asc(leads.nextFollowUpAt)).limit(200)
}

export async function bulkCreateLeads(ctx: RequestContext, items: ImportLeadValues[]): Promise<number> {
  if (!items.length) return 0
  const db = useDb()
  const values = items.map((it) => ({
    workspaceId: ctx.workspaceId,
    name: it.name,
    phoneE164: it.phoneE164,
    phoneRaw: it.phoneRaw,
    phoneValid: it.phoneValid,
    area: it.area,
    statusId: it.statusId,
    remarks: it.remarks,
    assignedTo: ctx.userId,
    source: 'import' as const,
    tags: [],
    createdBy: ctx.userId,
  }))
  return db.transaction(async (tx) => {
    const [res] = await tx.insert(leads).values(values)
    const firstId = Number(res.insertId)
    // Re-read the ACTUAL ids of the rows we just inserted (don't assume contiguity).
    const inserted = await tx
      .select({ id: leads.id })
      .from(leads)
      .where(and(
        eq(leads.workspaceId, ctx.workspaceId),
        eq(leads.createdBy, ctx.userId),
        eq(leads.source, 'import'),
        gte(leads.id, firstId),
      ))
      .orderBy(asc(leads.id))
      .limit(values.length)
    if (inserted.length) {
      await tx.insert(activities).values(
        inserted.map((row) => ({
          workspaceId: ctx.workspaceId,
          leadId: row.id,
          type: 'imported' as const,
          actorUserId: ctx.userId,
        })),
      )
    }
    return values.length
  })
}

/** Set status on visible leads in `ids`; logs one status_change activity each. */
export async function bulkSetStatus(ctx: RequestContext, ids: number[], statusId: number | null): Promise<number> {
  if (!ids.length) return 0
  const db = useDb()
  await assertStatusInWorkspace(ctx, statusId)
  const visible = await db.select({ id: leads.id }).from(leads).where(and(whereFor(ctx, {}), inArray(leads.id, ids)))
  const vids = visible.map((r) => r.id)
  if (!vids.length) return 0
  await db.update(leads).set({ statusId }).where(and(eq(leads.workspaceId, ctx.workspaceId), inArray(leads.id, vids)))
  await db.insert(activities).values(vids.map((leadId) => ({
    workspaceId: ctx.workspaceId, leadId, type: 'status_change' as const, actorUserId: ctx.userId, detail: { statusId },
  })))
  return vids.length
}

/** Reassign visible leads in `ids` to `assignedTo`; logs one assigned activity each. Owner-only (enforced at endpoint). */
export async function bulkAssign(ctx: RequestContext, ids: number[], assignedTo: number): Promise<number> {
  if (!ids.length) return 0
  const db = useDb()
  const visible = await db.select({ id: leads.id }).from(leads).where(and(whereFor(ctx, {}), inArray(leads.id, ids)))
  const vids = visible.map((r) => r.id)
  if (!vids.length) return 0
  await db.update(leads).set({ assignedTo }).where(and(eq(leads.workspaceId, ctx.workspaceId), inArray(leads.id, vids)))
  await db.insert(activities).values(vids.map((leadId) => ({
    workspaceId: ctx.workspaceId, leadId, type: 'assigned' as const, actorUserId: ctx.userId, detail: { assignedTo },
  })))
  return vids.length
}

/** Delete visible leads in `ids`. Returns count deleted. */
export async function bulkDelete(ctx: RequestContext, ids: number[]): Promise<number> {
  if (!ids.length) return 0
  const db = useDb()
  const visible = await db.select({ id: leads.id }).from(leads).where(and(whereFor(ctx, {}), inArray(leads.id, ids)))
  const vids = visible.map((r) => r.id)
  if (!vids.length) return 0
  await db.delete(leads).where(and(eq(leads.workspaceId, ctx.workspaceId), inArray(leads.id, vids)))
  return vids.length
}
