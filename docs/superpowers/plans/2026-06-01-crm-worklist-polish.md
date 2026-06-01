# Leads Worklist Polish + Call Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Leads table (spec §4.3 screen 1) and the Call behavior (§4.4): add area/assignee/"due" filters, sort + pagination controls, bulk select → assign/change-status/delete, inline remarks edit, and the "How'd it go?" call-outcome picker that logs a `call` activity.

**Architecture:** The server already supports `area`/`assignedTo` filters, `sort`/`dir`, and pagination in `listLeads`; this plan exposes them in the UI and adds three thin server pieces — a `dueOnly` filter, a bulk-action endpoint, and a per-lead call-log endpoint. Visibility is always enforced by routing every query through the existing `whereFor(ctx, …)` scope, so agents can only bulk-act on their own leads and only owners may assign.

**Tech Stack:** Nuxt 4 (Vue 3 + TS), Tailwind v4, Drizzle + MySQL, `nuxt-auth-utils`, Vitest. Reuses `requireContext`/`requireOwner`, `logActivity`, `useLeads`, the warm `DESIGN.md`.

**Plan:** Plan 6 of the Phase-1 sequence (first of three "finish Phase 1" plans). Spec: `docs/superpowers/specs/2026-05-21-property-crm-core-design.md` (§4.3 screen 1, §4.4, §4.5).

**Conventions (all tasks):**
- Run from project root `/Users/brendxn___/Desktop/PWA-PropertyAgentCRM`. Branch: `feat/worklist`.
- Tests `*.spec.ts` next to code. Single: `pnpm vitest run <path>`. All: `pnpm test:run`. Keep `pnpm exec nuxi typecheck` at 0.
- Commit per task; `git add` only named files (no `-A`). Aliases `~~/` root, `~/` app. Follow `DESIGN.md` (terracotta accent, warm neutrals, WCAG AA, status never by colour alone).

---

## Task 1: Server foundation — dueOnly filter, bulk actions, call log, composable (TDD where pure)

**Files:**
- Modify: `app/composables/useLeads.ts`
- Create: `app/composables/useLeads.spec.ts`
- Modify: `shared/schemas/lead.ts`, `shared/schemas/lead.spec.ts`
- Modify: `server/utils/leads.repo.ts`, `server/api/leads/index.get.ts`
- Create: `server/api/leads/bulk.post.ts`, `server/api/leads/[id]/call.post.ts`

- [ ] **Step 1: Write the failing composable test**

Create `app/composables/useLeads.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildLeadsQuery } from './useLeads'

describe('buildLeadsQuery', () => {
  it('always includes page and pageSize', () => {
    expect(buildLeadsQuery({ page: 2, pageSize: 50 })).toEqual({ page: 2, pageSize: 50 })
  })
  it('includes optional filters only when set', () => {
    const q = buildLeadsQuery({
      page: 1, pageSize: 50, statusId: 3, assignedTo: 7,
      area: 'PJ', search: 'sam', sort: 'name', dir: 'asc', dueOnly: true,
    })
    expect(q).toEqual({ page: 1, pageSize: 50, statusId: 3, assignedTo: 7, area: 'PJ', search: 'sam', sort: 'name', dir: 'asc', due: 1 })
  })
  it('omits dueOnly when false/undefined', () => {
    expect(buildLeadsQuery({ page: 1, pageSize: 50, dueOnly: false }).due).toBeUndefined()
    expect(buildLeadsQuery({ page: 1, pageSize: 50 }).due).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (`due` not produced).

Run: `pnpm vitest run app/composables/useLeads.spec.ts`

- [ ] **Step 3: Extend `app/composables/useLeads.ts`**

Add `dueOnly?: boolean` to the `LeadsQuery` interface, emit `due: 1` from `buildLeadsQuery`, and add `logCall` + `bulk` methods. The full file becomes:
```ts
import type { LeadInput } from '~~/shared/schemas/lead'

export interface LeadsQuery {
  page: number
  pageSize: number
  statusId?: number
  assignedTo?: number
  area?: string
  search?: string
  sort?: 'name' | 'createdAt' | 'area'
  dir?: 'asc' | 'desc'
  dueOnly?: boolean
}

/** Pure: strips undefined/empty values so the URL stays clean. */
export function buildLeadsQuery(q: LeadsQuery): Record<string, string | number> {
  const out: Record<string, string | number> = { page: q.page, pageSize: q.pageSize }
  if (q.statusId) out.statusId = q.statusId
  if (q.assignedTo) out.assignedTo = q.assignedTo
  if (q.area) out.area = q.area
  if (q.search) out.search = q.search
  if (q.sort) out.sort = q.sort
  if (q.dir) out.dir = q.dir
  if (q.dueOnly) out.due = 1
  return out
}

export interface BulkActionBody {
  action: 'assign' | 'status' | 'delete'
  ids: number[]
  assignedTo?: number | null
  statusId?: number | null
}

export function useLeads() {
  // useRequestFetch forwards the request cookies during SSR (plain $fetch does not),
  // so the leads list loads on a full page render, not just after client navigation.
  const request = useRequestFetch()
  async function list(q: LeadsQuery) {
    return request('/api/leads', { query: buildLeadsQuery(q) })
  }
  async function create(data: LeadInput) {
    return request('/api/leads', { method: 'POST', body: data })
  }
  async function update(id: number, data: Partial<LeadInput>) {
    return request(`/api/leads/${id}`, { method: 'PATCH', body: data })
  }
  async function remove(id: number) {
    return request(`/api/leads/${id}`, { method: 'DELETE' })
  }
  async function logCall(id: number, statusId?: number | null) {
    return request(`/api/leads/${id}/call`, { method: 'POST', body: { statusId } })
  }
  async function bulk(body: BulkActionBody) {
    return request<{ ok: true; affected: number }>('/api/leads/bulk', { method: 'POST', body })
  }
  return { list, create, update, remove, logCall, bulk }
}
```

- [ ] **Step 4: Run the composable test — expect PASS.**

Run: `pnpm vitest run app/composables/useLeads.spec.ts`

- [ ] **Step 5: Write failing bulk-schema tests**

In `shared/schemas/lead.spec.ts`, add `bulkActionSchema` to the existing import from `./lead`, then append:
```ts
describe('bulkActionSchema', () => {
  it('accepts a delete with ids', () => {
    expect(bulkActionSchema.safeParse({ action: 'delete', ids: [1, 2, 3] }).success).toBe(true)
  })
  it('requires assignedTo for an assign action', () => {
    expect(bulkActionSchema.safeParse({ action: 'assign', ids: [1] }).success).toBe(false)
    expect(bulkActionSchema.safeParse({ action: 'assign', ids: [1], assignedTo: 5 }).success).toBe(true)
  })
  it('requires statusId for a status action', () => {
    expect(bulkActionSchema.safeParse({ action: 'status', ids: [1] }).success).toBe(false)
    expect(bulkActionSchema.safeParse({ action: 'status', ids: [1], statusId: 2 }).success).toBe(true)
  })
  it('rejects an empty id list', () => {
    expect(bulkActionSchema.safeParse({ action: 'delete', ids: [] }).success).toBe(false)
  })
})
```

- [ ] **Step 6: Run — expect FAIL** (`bulkActionSchema` undefined).

Run: `pnpm vitest run shared/schemas/lead.spec.ts`

- [ ] **Step 7: Add `bulkActionSchema` to `shared/schemas/lead.ts`**

Append to the file (after `leadPatchSchema`):
```ts
export const bulkActionSchema = z
  .object({
    ids: z.array(z.number().int().positive()).min(1).max(200),
    action: z.enum(['assign', 'status', 'delete']),
    assignedTo: z.number().int().positive().nullable().optional(),
    statusId: z.number().int().positive().nullable().optional(),
  })
  .refine((d) => d.action !== 'assign' || d.assignedTo !== undefined, { message: 'assign requires assignedTo', path: ['assignedTo'] })
  .refine((d) => d.action !== 'status' || d.statusId !== undefined, { message: 'status requires statusId', path: ['statusId'] })

export type BulkAction = z.infer<typeof bulkActionSchema>
```

- [ ] **Step 8: Run schema tests — expect PASS.**

Run: `pnpm vitest run shared/schemas/lead.spec.ts`

- [ ] **Step 9: Add `dueOnly` + bulk repo functions to `server/utils/leads.repo.ts`**

(a) Add `inArray` to the drizzle import on line 1:
```ts
import { and, asc, desc, eq, inArray, isNotNull, like, or, sql } from 'drizzle-orm'
```
(b) Add `dueOnly?: boolean` to the `LeadListFilters` interface.
(c) In `whereFor`, immediately after the `if (filters.search) { … }` block and before `return and(...conds)`, add:
```ts
  if (filters.dueOnly) {
    conds.push(isNotNull(leads.nextFollowUpAt))
    conds.push(sql`date(${leads.nextFollowUpAt}) <= curdate()`)
  }
```
(d) Append these three functions at the end of the file:
```ts
/** Set status on visible leads in `ids`; logs one status_change activity each. */
export async function bulkSetStatus(ctx: RequestContext, ids: number[], statusId: number | null): Promise<number> {
  if (!ids.length) return 0
  const db = useDb()
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
```
(`activities` is already imported on line 2. `ListOpts extends LeadListFilters`, so `dueOnly` is automatically a valid option.)

- [ ] **Step 10: Parse `due` in `server/api/leads/index.get.ts`**

Add one line inside the `listLeads(ctx, { … })` call:
```ts
    dueOnly: q.due === '1' || q.due === 'true',
```

- [ ] **Step 11: Create `server/api/leads/bulk.post.ts`**

```ts
import { bulkActionSchema } from '~~/shared/schemas/lead'
import { bulkAssign, bulkSetStatus, bulkDelete } from '~~/server/utils/leads.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const body = bulkActionSchema.parse(await readBody(event))
  if (body.action === 'assign') {
    requireOwner(ctx)
    if (body.assignedTo == null) throw createError({ statusCode: 400, message: 'assignedTo required' })
    return { ok: true, affected: await bulkAssign(ctx, body.ids, body.assignedTo) }
  }
  if (body.action === 'status') {
    return { ok: true, affected: await bulkSetStatus(ctx, body.ids, body.statusId ?? null) }
  }
  return { ok: true, affected: await bulkDelete(ctx, body.ids) }
})
```

- [ ] **Step 12: Create `server/api/leads/[id]/call.post.ts`**

```ts
import { z } from 'zod'
import { getLead, updateLead } from '~~/server/utils/leads.repo'
import { logActivity } from '~~/server/utils/activities.repo'

const bodySchema = z.object({ statusId: z.number().int().positive().nullable().optional() })

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  const lead = await getLead(ctx, id)
  if (!lead) throw createError({ statusCode: 404, message: 'Lead not found' })
  const body = bodySchema.parse(await readBody(event).catch(() => ({})))
  await logActivity(ctx, id, 'call', body.statusId ? { statusId: body.statusId } : undefined)
  if (body.statusId !== undefined && body.statusId !== null) {
    await updateLead(ctx, id, { statusId: body.statusId })
  }
  return { ok: true }
})
```

- [ ] **Step 13: Typecheck + full tests + commit**

Run: `pnpm exec nuxi typecheck && pnpm test:run` (0 errors; all specs pass incl. the two new blocks).
```bash
git add app/composables/useLeads.ts app/composables/useLeads.spec.ts shared/schemas/lead.ts shared/schemas/lead.spec.ts server/utils/leads.repo.ts server/api/leads/index.get.ts server/api/leads/bulk.post.ts "server/api/leads/[id]/call.post.ts"
git commit -m "feat(leads): dueOnly filter, bulk actions, call-log endpoint + composable methods"
```

---

## Task 2: Table + filters UI — FiltersBar, LeadsTable (select/inline-remarks/sort), CallButton picker

**Files:**
- Modify: `app/components/FiltersBar.vue`, `app/components/LeadsTable.vue`, `app/components/CallButton.vue`

> All controls follow `DESIGN.md`. Status is shown by label (not colour alone). Owner-only controls use an `isOwner` prop.

- [ ] **Step 1: Expand `app/components/FiltersBar.vue`**

Replace the whole file with:
```vue
<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'

interface MemberOpt { userId: number; name: string }
defineProps<{ statuses: StatusRow[]; members?: MemberOpt[]; isOwner?: boolean }>()

const search = defineModel<string>('search', { default: '' })
const statusId = defineModel<number | null>('statusId', { default: null })
const area = defineModel<string>('area', { default: '' })
const assignedTo = defineModel<number | null>('assignedTo', { default: null })
const dueOnly = defineModel<boolean>('dueOnly', { default: false })
const sort = defineModel<'name' | 'createdAt' | 'area'>('sort', { default: 'createdAt' })
const dir = defineModel<'asc' | 'desc'>('dir', { default: 'desc' })

function clearAll() {
  search.value = ''
  statusId.value = null
  area.value = ''
  assignedTo.value = null
  dueOnly.value = false
  sort.value = 'createdAt'
  dir.value = 'desc'
}
const sel = 'rounded-md border border-line bg-surface px-3 py-2 text-sm'
</script>

<template>
  <div class="mb-5 flex flex-wrap items-center gap-3">
    <div class="relative">
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <input v-model="search" type="search" placeholder="Search name or phone…" class="w-64 rounded-md border border-line bg-surface py-2 pl-9 pr-3 text-sm">
    </div>

    <select :class="sel" :value="statusId ?? ''" @change="statusId = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null">
      <option value="">All statuses</option>
      <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
    </select>

    <input v-model="area" type="text" placeholder="Area" class="w-32 rounded-md border border-line bg-surface px-3 py-2 text-sm">

    <select v-if="isOwner && members?.length" :class="sel" :value="assignedTo ?? ''" @change="assignedTo = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null">
      <option value="">All agents</option>
      <option v-for="m in members" :key="m.userId" :value="m.userId">{{ m.name }}</option>
    </select>

    <label class="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted">
      <input v-model="dueOnly" type="checkbox" class="accent-accent"> Due only
    </label>

    <select :class="sel" v-model="sort">
      <option value="createdAt">Newest</option>
      <option value="name">Name</option>
      <option value="area">Area</option>
    </select>
    <button class="rounded-md border border-line bg-surface px-2.5 py-2 text-sm text-muted hover:text-ink" :aria-label="dir === 'asc' ? 'Ascending' : 'Descending'" @click="dir = dir === 'asc' ? 'desc' : 'asc'">
      {{ dir === 'asc' ? '↑' : '↓' }}
    </button>

    <button class="ml-auto rounded-md px-2.5 py-2 text-sm text-faint hover:text-ink" @click="clearAll">Clear</button>
  </div>
</template>
```

- [ ] **Step 2: Rebuild `app/components/LeadsTable.vue`** with select column, inline remarks, sortable headers

Replace the whole file with:
```vue
<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'

interface LeadRow {
  id: number; name: string; phoneE164: string | null; phoneRaw: string | null
  area: string; statusId: number | null; remarks: string | null
}
const props = defineProps<{ rows: LeadRow[]; statuses: StatusRow[]; loading?: boolean; sort?: string; dir?: string }>()
const emit = defineEmits<{
  open: [id: number]
  statusChange: [id: number, statusId: number]
  remarksChange: [id: number, remarks: string]
  logged: []
  sortBy: [col: 'name' | 'area' | 'createdAt']
}>()

const selected = defineModel<number[]>('selected', { default: () => [] })

const allChecked = computed(() => props.rows.length > 0 && props.rows.every((r) => selected.value.includes(r.id)))
const someChecked = computed(() => props.rows.some((r) => selected.value.includes(r.id)) && !allChecked.value)
function toggleAll() {
  selected.value = allChecked.value ? [] : props.rows.map((r) => r.id)
}
function toggleOne(id: number) {
  selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id]
}
function arrow(col: string) {
  if (props.sort !== col) return ''
  return props.dir === 'asc' ? ' ↑' : ' ↓'
}
const th = 'px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line'
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
    <table class="w-full text-sm">
      <thead class="bg-canvas/60">
        <tr>
          <th class="w-10 border-b border-line px-4 py-3">
            <input type="checkbox" class="accent-accent" :checked="allChecked" :indeterminate.prop="someChecked" aria-label="Select all" @change="toggleAll">
          </th>
          <th :class="[th, 'cursor-pointer select-none']" @click="emit('sortBy', 'name')">Name{{ arrow('name') }}</th>
          <th :class="th">Phone</th>
          <th :class="[th, 'cursor-pointer select-none']" @click="emit('sortBy', 'area')">Area{{ arrow('area') }}</th>
          <th :class="th">Status</th>
          <th :class="th">Remarks</th>
          <th :class="[th, 'text-right']">Contact</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="loading">
          <tr v-for="i in 6" :key="`skel-${i}`" class="border-t border-line">
            <td class="px-4 py-3.5"><div class="h-4 w-4 rounded bg-line animate-pulse" /></td>
            <td class="px-4 py-3.5"><div class="h-3.5 w-32 rounded bg-line animate-pulse" /></td>
            <td class="px-4 py-3.5"><div class="h-3.5 w-28 rounded bg-line animate-pulse" /></td>
            <td class="px-4 py-3.5"><div class="h-3.5 w-20 rounded bg-line animate-pulse" /></td>
            <td class="px-4 py-3.5"><div class="h-5 w-24 rounded-full bg-line animate-pulse" /></td>
            <td class="px-4 py-3.5"><div class="h-3.5 w-24 rounded bg-line animate-pulse" /></td>
            <td class="px-4 py-3.5"><div class="flex justify-end gap-2"><div class="h-6 w-14 rounded-md bg-line animate-pulse" /><div class="h-6 w-10 rounded-md bg-line animate-pulse" /></div></td>
          </tr>
        </template>

        <template v-else>
          <tr v-for="row in rows" :key="row.id" class="border-t border-line transition-colors hover:bg-accent-soft/40" :class="selected.includes(row.id) ? 'bg-accent-soft/30' : ''">
            <td class="px-4 py-3.5">
              <input type="checkbox" class="accent-accent" :checked="selected.includes(row.id)" :aria-label="`Select ${row.name || 'lead'}`" @change="toggleOne(row.id)">
            </td>
            <td class="cursor-pointer px-4 py-3.5 font-medium text-ink transition-colors hover:text-accent" @click="emit('open', row.id)">{{ row.name || '—' }}</td>
            <td class="px-4 py-3.5 font-mono text-[13px] text-muted">{{ row.phoneE164 || row.phoneRaw || '—' }}</td>
            <td class="px-4 py-3.5 text-muted">{{ row.area || '—' }}</td>
            <td class="px-4 py-3.5">
              <StatusSelect :model-value="row.statusId" :statuses="statuses" @update:model-value="(v) => emit('statusChange', row.id, v)" />
            </td>
            <td class="px-4 py-3.5">
              <input
                :value="row.remarks ?? ''"
                placeholder="—"
                class="w-40 rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] text-muted hover:border-line focus:border-accent focus:text-ink"
                @change="emit('remarksChange', row.id, ($event.target as HTMLInputElement).value)"
              >
            </td>
            <td class="px-4 py-3.5">
              <div class="flex justify-end gap-2">
                <CallButton :e164="row.phoneE164" :lead-id="row.id" :statuses="statuses" @logged="emit('logged')" />
                <WhatsAppButton :e164="row.phoneE164" />
              </div>
            </td>
          </tr>

          <tr v-if="!rows.length">
            <td colspan="7" class="py-16 text-center">
              <div class="flex flex-col items-center gap-3">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-faint">
                  <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/>
                </svg>
                <div>
                  <p class="font-medium text-ink">No leads found</p>
                  <p class="mt-0.5 text-sm text-faint">Adjust your filters, add a lead, or import your spreadsheet.</p>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
```

- [ ] **Step 3: Add the "How'd it go?" picker to `app/components/CallButton.vue`**

Replace the whole file with:
```vue
<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
const props = defineProps<{ e164: string | null; leadId?: number; statuses?: StatusRow[] }>()
const emit = defineEmits<{ logged: [] }>()
const { logCall } = useLeads()
const open = ref(false)

async function onCall() {
  if (props.e164) await navigator.clipboard?.writeText(props.e164)
  if (props.leadId) open.value = true // the tel: href still fires; this just prompts the outcome
}
async function pick(statusId: number | null) {
  open.value = false
  if (!props.leadId) return
  try { await logCall(props.leadId, statusId) }
  finally { emit('logged') }
}
</script>

<template>
  <div class="relative inline-block">
    <a
      v-if="e164"
      :href="`tel:${e164}`"
      class="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-white shadow-card hover:bg-accent-strong active:translate-y-px"
      @click="onCall"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.45 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.91-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
      Call
    </a>
    <span v-else class="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-faint">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.45 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.91-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
      Call
    </span>

    <template v-if="open">
      <div class="fixed inset-0 z-30" @click="open = false" />
      <div class="absolute right-0 z-40 mt-1.5 w-52 rounded-lg border border-line bg-surface p-1.5 shadow-pop">
        <p class="px-2 py-1.5 text-xs font-medium text-faint">How'd it go?</p>
        <button
          v-for="s in statuses ?? []"
          :key="s.id"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted hover:bg-canvas hover:text-ink"
          @click="pick(s.id)"
        >
          <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: s.color }" />{{ s.label }}
        </button>
        <button class="mt-1 w-full rounded-md border-t border-line px-2 py-1.5 text-left text-xs text-faint hover:text-ink" @click="pick(null)">Just log the call</button>
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 4: Typecheck + build + commit**

Run: `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0 errors; tests pass; build completes).
```bash
git add app/components/FiltersBar.vue app/components/LeadsTable.vue app/components/CallButton.vue
git commit -m "feat(leads): expanded filters, sortable headers, row select + inline remarks, call outcome picker"
```

---

## Task 3: Page wiring — filters/sort/page state, bulk action bar, pagination, members

**Files:**
- Modify: `app/pages/index.vue`

> Owner gets the assignee filter + bulk-assign; agents do not (and the bulk endpoint 403s assign for them anyway).

- [ ] **Step 1: Replace `app/pages/index.vue`** with:
```vue
<script setup lang="ts">
const { list, update, bulk } = useLeads()
const { statuses, load: loadStatuses } = useStatuses()
const { session } = useUserSession()
const isOwner = computed(() => (session.value as { role?: string } | null)?.role === 'owner')

const search = ref('')
const statusId = ref<number | null>(null)
const area = ref('')
const assignedTo = ref<number | null>(null)
const dueOnly = ref(false)
const sort = ref<'name' | 'createdAt' | 'area'>('createdAt')
const dir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = 50

const openId = ref<number | null>(null)
const showAdd = ref(false)
const selected = ref<number[]>([])

// Reset to page 1 whenever a filter/sort changes.
watch([search, statusId, area, assignedTo, dueOnly, sort, dir], () => { page.value = 1 })

await loadStatuses()
const { data: members } = useFetch<{ userId: number; name: string }[]>('/api/members', {
  lazy: true, immediate: isOwner.value, default: () => [],
})

const { data, refresh, pending } = await useAsyncData('leads', () =>
  list({
    page: page.value, pageSize,
    search: search.value || undefined,
    statusId: statusId.value || undefined,
    area: area.value || undefined,
    assignedTo: assignedTo.value || undefined,
    dueOnly: dueOnly.value,
    sort: sort.value, dir: dir.value,
  }),
  { watch: [search, statusId, area, assignedTo, dueOnly, sort, dir, page] },
)

const total = computed(() => (data.value as { total?: number } | null)?.total ?? 0)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const rangeStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * pageSize + 1))
const rangeEnd = computed(() => Math.min(page.value * pageSize, total.value))

async function reload() { await refresh() }
async function onStatusChange(id: number, newStatusId: number) { await update(id, { statusId: newStatusId }); await refresh() }
async function onRemarksChange(id: number, remarks: string) { await update(id, { remarks }) }
function onSortBy(col: 'name' | 'area' | 'createdAt') {
  if (sort.value === col) dir.value = dir.value === 'asc' ? 'desc' : 'asc'
  else { sort.value = col; dir.value = 'asc' }
}
async function onCreated() { showAdd.value = false; await refresh() }

// Bulk actions
const bulkStatusId = ref<number | null>(null)
const bulkAssignee = ref<number | null>(null)
async function applyBulkStatus() {
  if (!bulkStatusId.value || !selected.value.length) return
  await bulk({ action: 'status', ids: selected.value, statusId: bulkStatusId.value })
  bulkStatusId.value = null; selected.value = []; await refresh()
}
async function applyBulkAssign() {
  if (!bulkAssignee.value || !selected.value.length) return
  await bulk({ action: 'assign', ids: selected.value, assignedTo: bulkAssignee.value })
  bulkAssignee.value = null; selected.value = []; await refresh()
}
async function applyBulkDelete() {
  if (!selected.value.length) return
  if (!confirm(`Delete ${selected.value.length} lead(s)? This cannot be undone.`)) return
  await bulk({ action: 'delete', ids: selected.value })
  selected.value = []; await refresh()
}
const selBtn = 'rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm'
</script>

<template>
  <div>
    <ClientOnly>
      <Teleport to="#topbar-actions">
        <button class="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-card transition-colors hover:bg-accent-strong active:translate-y-px" @click="showAdd = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add lead
        </button>
      </Teleport>
    </ClientOnly>

    <FiltersBar
      v-model:search="search"
      v-model:status-id="statusId"
      v-model:area="area"
      v-model:assigned-to="assignedTo"
      v-model:due-only="dueOnly"
      v-model:sort="sort"
      v-model:dir="dir"
      :statuses="statuses"
      :members="members ?? []"
      :is-owner="isOwner"
    />

    <!-- Bulk action bar -->
    <div v-if="selected.length" class="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft/40 px-4 py-2.5 text-sm">
      <span class="font-medium text-ink">{{ selected.length }} selected</span>
      <span class="mx-1 h-4 w-px bg-line" />
      <select :class="selBtn" v-model.number="bulkStatusId">
        <option :value="null">Set status…</option>
        <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
      </select>
      <button :class="selBtn" :disabled="!bulkStatusId" class="disabled:opacity-50" @click="applyBulkStatus">Apply</button>
      <template v-if="isOwner && (members ?? []).length">
        <span class="mx-1 h-4 w-px bg-line" />
        <select :class="selBtn" v-model.number="bulkAssignee">
          <option :value="null">Assign to…</option>
          <option v-for="m in members ?? []" :key="m.userId" :value="m.userId">{{ m.name }}</option>
        </select>
        <button :class="selBtn" :disabled="!bulkAssignee" class="disabled:opacity-50" @click="applyBulkAssign">Assign</button>
      </template>
      <span class="mx-1 h-4 w-px bg-line" />
      <button class="rounded-md border border-red-200 px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50" @click="applyBulkDelete">Delete</button>
      <button class="ml-auto text-sm text-faint hover:text-ink" @click="selected = []">Clear selection</button>
    </div>

    <LeadsTable
      v-model:selected="selected"
      :rows="(data?.rows ?? []) as any"
      :statuses="statuses"
      :loading="pending"
      :sort="sort"
      :dir="dir"
      @open="openId = $event"
      @status-change="onStatusChange"
      @remarks-change="onRemarksChange"
      @sort-by="onSortBy"
      @logged="reload"
    />

    <!-- Pagination -->
    <div class="mt-4 flex items-center justify-between text-sm text-muted">
      <span>{{ rangeStart }}–{{ rangeEnd }} of {{ total }}</span>
      <div class="flex items-center gap-2">
        <button class="rounded-md border border-line bg-surface px-3 py-1.5 disabled:opacity-50" :disabled="page <= 1" @click="page--">Previous</button>
        <span class="tabular-nums">Page {{ page }} / {{ pageCount }}</span>
        <button class="rounded-md border border-line bg-surface px-3 py-1.5 disabled:opacity-50" :disabled="page >= pageCount" @click="page++">Next</button>
      </div>
    </div>

    <LeadDetailPanel v-if="openId" :lead-id="openId" @close="openId = null" @changed="refresh" />
    <AddLeadModal v-if="showAdd" :statuses="statuses" @created="onCreated" @close="showAdd = false" />
  </div>
</template>
```

- [ ] **Step 2: Typecheck + build + commit**

Run: `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; tests pass; build completes).
```bash
git add app/pages/index.vue
git commit -m "feat(leads): wire filters/sort/pagination, bulk action bar, owner assignee filter"
```

---

## Task 4: Full verification + smoke

**Files:** none.

- [ ] **Step 1:** `pnpm test:run` — all specs pass (incl. `useLeads.spec.ts` and the new `bulkActionSchema` block).
- [ ] **Step 2:** `pnpm exec nuxi typecheck && pnpm build` — 0 errors; build completes.
- [ ] **Step 3: Manual smoke (dev + MySQL):**
  1. Filter by status, by area text, toggle "Due only" — list narrows; clearing restores it.
  2. Click the **Name**/**Area** headers — sort flips asc/desc (arrow shows).
  3. Edit a **Remarks** cell inline, blur — value persists after refresh.
  4. Click **Call** on a row → number copied + the "How'd it go?" picker appears → pick a status → the lead's status updates and a `call` activity appears in the detail panel's Activity log; "Just log the call" logs without changing status.
  5. Select several rows → bulk **Set status** + **Apply**; (as owner) bulk **Assign**; **Delete** with confirm.
  6. Add enough leads to exceed one page → **Previous/Next** paginate; the range/count reads correctly.
  7. As an **agent**: no assignee filter, no bulk-assign control; bulk status/delete only affects their own leads.

- [ ] **Step 4: Merge to master**
```bash
git checkout master && git merge --ff-only feat/worklist && git branch -d feat/worklist
```

---

## Done criteria
- `pnpm test:run` green, typecheck 0, build succeeds.
- Leads table has search + status/area/assignee/due filters, column sort, pagination, bulk assign/status/delete, inline remarks edit; Call copies the number, prompts an outcome, logs a `call` activity and (optionally) updates status — fulfilling §4.3 screen 1 and §4.4.
