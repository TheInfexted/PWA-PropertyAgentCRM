import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm'
import { leads } from '~~/server/db/schema'
import { leadVisibilityScope, type VisibilityContext } from '~~/shared/utils/visibility'
import { normalizePhone } from '~~/shared/utils/phone'
import type { LeadInput } from '~~/shared/schemas/lead'
import type { RequestContext } from './context'

export interface LeadListFilters {
  statusId?: number
  area?: string
  assignedTo?: number
  search?: string
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

export async function createLead(ctx: RequestContext, data: LeadInput) {
  const db = useDb()
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
    nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
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
  const patch: Partial<typeof leads.$inferInsert> = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.area !== undefined) patch.area = data.area
  if (data.remarks !== undefined) patch.remarks = data.remarks
  if (data.statusId !== undefined) patch.statusId = data.statusId
  if (data.assignedTo !== undefined && ctx.role === 'owner') patch.assignedTo = data.assignedTo
  if (data.nextFollowUpAt !== undefined) patch.nextFollowUpAt = data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null
  if (data.email !== undefined) patch.email = data.email || null
  if (data.intent !== undefined) patch.intent = data.intent ?? null
  if (data.propertyType !== undefined) patch.propertyType = data.propertyType ?? null
  if (data.budgetMin !== undefined) patch.budgetMin = data.budgetMin ?? null
  if (data.budgetMax !== undefined) patch.budgetMax = data.budgetMax ?? null
  if (data.tags !== undefined) patch.tags = data.tags
  if (data.phone !== undefined) Object.assign(patch, applyPhone(data as { phone?: string }))
  await db.update(leads).set(patch).where(and(eq(leads.workspaceId, ctx.workspaceId), eq(leads.id, id)))
  return getLead(ctx, id)
}

export async function deleteLead(ctx: RequestContext, id: number) {
  const db = useDb()
  await db.delete(leads).where(and(eq(leads.workspaceId, ctx.workspaceId), eq(leads.id, id)))
}
