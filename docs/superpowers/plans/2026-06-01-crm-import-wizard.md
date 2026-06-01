# CRM Import Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an agent move their existing spreadsheet into the CRM: paste rows or upload a CSV, map columns, preview with cleaned phones + duplicate/error flags, and confirm to bulk-create leads.

**Architecture:** Pure parsing/mapping/normalization lives in `shared/utils/import.ts` (unit-tested). The client parses text and lets the user map columns; the server is the source of truth — it re-normalizes, validates, dupe-checks against the workspace, resolves statuses by label, and bulk-inserts. Two Nitro endpoints (`/api/import/preview`, `/api/import/commit`) reuse one annotate function.

**Tech Stack:** Nuxt 4 (Vue 3 + TS), Tailwind v4, Drizzle + MySQL, Vitest. Reuses existing `normalizePhone`, `leads.repo`, `requireContext`, `useRequestFetch`, and the warm `DESIGN.md` token system.

**Plan:** Plan 2 of the Phase-1 sequence. Spec: `docs/superpowers/specs/2026-05-21-property-crm-core-design.md`. Builds on Plan 1 (`2026-05-21-crm-core-foundation.md`).

**Conventions (all tasks):**
- Run from project root `/Users/brendxn___/Desktop/PWA-PropertyAgentCRM`.
- Tests are `*.spec.ts` next to the code. Single file: `pnpm vitest run <path>`. All: `pnpm test:run`.
- Keep `pnpm exec nuxi typecheck` at 0 errors. Commit per task with the message shown.
- `git add` only the files named in each task (no `git add -A`).
- Aliases: `~~/` = project root (for `server/`, `shared/`), `~/` = `app/`.

---

## Task 1: Delimited parser + column auto-mapping (TDD)

**Files:**
- Create: `shared/utils/import.ts`
- Test: `shared/utils/import.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `shared/utils/import.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseDelimited, autoMapColumns } from './import'

describe('parseDelimited', () => {
  it('parses tab-separated rows (spreadsheet paste)', () => {
    expect(parseDelimited('Name\tContact\nDean Cheong\t60128975215'))
      .toEqual([['Name', 'Contact'], ['Dean Cheong', '60128975215']])
  })
  it('parses CSV and respects quoted commas', () => {
    expect(parseDelimited('Name,Area\nDean,"Petaling, Jaya"'))
      .toEqual([['Name', 'Area'], ['Dean', 'Petaling, Jaya']])
  })
  it('unescapes doubled quotes inside a quoted field', () => {
    expect(parseDelimited('a,b\n"x""y",z')).toEqual([['a', 'b'], ['x"y', 'z']])
  })
  it('ignores trailing blank lines and CRLF', () => {
    expect(parseDelimited('a,b\r\n1,2\r\n\r\n')).toEqual([['a', 'b'], ['1', '2']])
  })
  it('returns [] for empty input', () => {
    expect(parseDelimited('   ')).toEqual([])
  })
})

describe('autoMapColumns', () => {
  it('maps the friend\'s headers', () => {
    expect(autoMapColumns(['Name', 'Contact', 'Area', 'Status', 'Remarks']))
      .toEqual({ name: 0, phone: 1, area: 2, status: 3, remarks: 4 })
  })
  it('matches aliases case-insensitively (Mobile, Location, Notes)', () => {
    const m = autoMapColumns(['Mobile', 'Location', 'Notes'])
    expect(m.phone).toBe(0)
    expect(m.area).toBe(1)
    expect(m.remarks).toBe(2)
    expect(m.name).toBeNull()
  })
  it('leaves unknown headers unmapped', () => {
    expect(autoMapColumns(['Foo', 'Bar']))
      .toEqual({ name: null, phone: null, area: null, status: null, remarks: null })
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pnpm vitest run shared/utils/import.spec.ts`
Expected: FAIL — cannot resolve `./import`.

- [ ] **Step 3: Implement the parser + mapper**

Create `shared/utils/import.ts`:
```ts
export interface ColumnMap {
  name: number | null
  phone: number | null
  area: number | null
  status: number | null
  remarks: number | null
}

/** Row annotated by the server preview. Shared so the client can render it. */
export interface AnnotatedRow {
  index: number
  name: string
  phoneRaw: string
  phoneE164: string | null
  phoneValid: boolean
  area: string
  statusLabel: string
  statusId: number | null
  remarks: string
  valid: boolean
  error: string | null
  duplicate: 'existing' | 'in-batch' | null
}

export function detectDelimiter(line: string): '\t' | ',' {
  const tabs = (line.match(/\t/g) || []).length
  const commas = (line.match(/,/g) || []).length
  return tabs > 0 && tabs >= commas ? '\t' : ','
}

/** Parse pasted TSV or CSV text into a grid of trimmed string cells. */
export function parseDelimited(text: string): string[][] {
  const clean = (text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!clean) return []
  const delim = detectDelimiter(clean.split('\n')[0] ?? '')

  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delim) {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); field = ''; row = []
    } else {
      field += c
    }
  }
  row.push(field); rows.push(row)
  return rows.map((r) => r.map((f) => f.trim())).filter((r) => r.some((f) => f !== ''))
}

const HEADER_ALIASES: Record<keyof ColumnMap, string[]> = {
  name: ['name', 'full name', 'lead', 'client', 'customer'],
  phone: ['phone', 'contact', 'number', 'mobile', 'hp', 'tel', 'telephone', 'phone number'],
  area: ['area', 'location', 'region', 'place', 'district', 'city'],
  status: ['status', 'stage'],
  remarks: ['remarks', 'remark', 'notes', 'note', 'comment', 'comments'],
}

/** Best-effort column map from a header row. Unknown headers stay null. */
export function autoMapColumns(header: string[]): ColumnMap {
  const map: ColumnMap = { name: null, phone: null, area: null, status: null, remarks: null }
  header.forEach((h, i) => {
    const key = h.trim().toLowerCase()
    for (const field of Object.keys(HEADER_ALIASES) as (keyof ColumnMap)[]) {
      if (map[field] === null && HEADER_ALIASES[field].includes(key)) {
        map[field] = i
        break
      }
    }
  })
  return map
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm vitest run shared/utils/import.spec.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/utils/import.ts shared/utils/import.spec.ts
git commit -m "feat(import): delimited parser + column auto-mapping"
```

---

## Task 2: Draft, normalize & in-batch dupe logic (TDD)

**Files:**
- Modify: `shared/utils/import.ts`
- Test: `shared/utils/import-draft.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `shared/utils/import-draft.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { toDraft, normalizeDraft, markInBatchDupes } from './import'
import type { AnnotatedRow } from './import'

const MAP = { name: 0, phone: 1, area: 2, status: 3, remarks: 4 }

describe('toDraft', () => {
  it('pulls the mapped cells (missing columns become empty)', () => {
    expect(toDraft(['Dean', '60128975215', 'PJ', 'Callback', 'hot'], MAP))
      .toEqual({ name: 'Dean', phone: '60128975215', area: 'PJ', statusLabel: 'Callback', remarks: 'hot' })
    expect(toDraft(['Dean'], MAP))
      .toEqual({ name: 'Dean', phone: '', area: '', statusLabel: '', remarks: '' })
  })
})

describe('normalizeDraft', () => {
  it('normalizes the phone and marks valid when there is a name or phone', () => {
    const r = normalizeDraft({ name: 'Dean', phone: '60128975215', area: '', statusLabel: '', remarks: '' })
    expect(r.phoneE164).toBe('+60128975215')
    expect(r.phoneValid).toBe(true)
    expect(r.valid).toBe(true)
    expect(r.error).toBeNull()
  })
  it('flags a row with neither name nor phone', () => {
    const r = normalizeDraft({ name: '', phone: '', area: 'PJ', statusLabel: '', remarks: '' })
    expect(r.valid).toBe(false)
    expect(r.error).toBe('No name or phone')
  })
})

describe('markInBatchDupes', () => {
  it('keeps the first occurrence, flags later same-phone rows', () => {
    const rows = [
      { phoneE164: '+60128975215', duplicate: null },
      { phoneE164: '+60111111111', duplicate: null },
      { phoneE164: '+60128975215', duplicate: null },
    ] as Pick<AnnotatedRow, 'phoneE164' | 'duplicate'>[]
    markInBatchDupes(rows)
    expect(rows.map((r) => r.duplicate)).toEqual([null, null, 'in-batch'])
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pnpm vitest run shared/utils/import-draft.spec.ts`
Expected: FAIL — `toDraft` etc. not exported.

- [ ] **Step 3: Implement (append to `shared/utils/import.ts`)**

Add these imports at the top of `shared/utils/import.ts` (below the existing interfaces):
```ts
import { normalizePhone } from '~~/shared/utils/phone'
```

Append to `shared/utils/import.ts`:
```ts
export interface DraftCells {
  name: string
  phone: string
  area: string
  statusLabel: string
  remarks: string
}

export function toDraft(row: string[], map: ColumnMap): DraftCells {
  const at = (i: number | null) => (i === null ? '' : (row[i] ?? '').trim())
  return {
    name: at(map.name),
    phone: at(map.phone),
    area: at(map.area),
    statusLabel: at(map.status),
    remarks: at(map.remarks),
  }
}

export type NormalizedDraft = Omit<AnnotatedRow, 'index' | 'statusId' | 'duplicate'>

export function normalizeDraft(d: DraftCells): NormalizedDraft {
  const p = normalizePhone(d.phone)
  const valid = Boolean(d.name) || Boolean(d.phone)
  return {
    name: d.name,
    phoneRaw: p.raw,
    phoneE164: p.e164,
    phoneValid: p.valid,
    area: d.area,
    statusLabel: d.statusLabel,
    remarks: d.remarks,
    valid,
    error: valid ? null : 'No name or phone',
  }
}

/** Mutates rows in place: second+ occurrence of a phone within the batch is 'in-batch'. */
export function markInBatchDupes(rows: Array<Pick<AnnotatedRow, 'phoneE164' | 'duplicate'>>): void {
  const seen = new Set<string>()
  for (const r of rows) {
    if (!r.phoneE164) continue
    if (seen.has(r.phoneE164)) r.duplicate = 'in-batch'
    else seen.add(r.phoneE164)
  }
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm vitest run shared/utils/import-draft.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/utils/import.ts shared/utils/import-draft.spec.ts
git commit -m "feat(import): row draft, phone normalization, in-batch dedupe"
```

---

## Task 3: Server annotate + commit + bulk insert

**Files:**
- Create: `server/utils/import.repo.ts`
- Modify: `server/utils/leads.repo.ts`

> DB-backed; verified by typecheck now and the smoke run in Task 7. The pure logic it composes is already unit-tested in Tasks 1-2.

- [ ] **Step 1: Add a bulk insert to the leads repo**

Append to `server/utils/leads.repo.ts`:
```ts
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
  const [res] = await db.insert(leads).values(values)
  // InnoDB assigns contiguous ids for a single multi-row insert (default autoinc lock mode).
  const firstId = Number(res.insertId)
  await db.insert(activities).values(
    values.map((_, i) => ({
      workspaceId: ctx.workspaceId,
      leadId: firstId + i,
      type: 'imported' as const,
      actorUserId: ctx.userId,
    })),
  )
  return values.length
}
```

Add `activities` to the existing schema import at the top of `server/utils/leads.repo.ts` (it currently imports only `leads`):
```ts
import { leads, activities } from '~~/server/db/schema'
```

- [ ] **Step 2: Implement the import repo**

Create `server/utils/import.repo.ts`:
```ts
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

/** Insert the valid rows. Always skip in-batch repeats; skip existing dupes unless includeDuplicates. */
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
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec nuxi typecheck`
Expected: 0 errors. (If `.set`/insert typing complains, the values object already matches `leads.$inferInsert`; do not add casts unless the compiler requires it, and never weaken the workspace scoping.)

- [ ] **Step 4: Commit**

```bash
git add server/utils/import.repo.ts server/utils/leads.repo.ts
git commit -m "feat(import): server annotate + commit + bulk lead insert"
```

---

## Task 4: Preview & commit API endpoints

**Files:**
- Create: `server/api/import/preview.post.ts`, `server/api/import/commit.post.ts`

- [ ] **Step 1: Preview endpoint**

Create `server/api/import/preview.post.ts`:
```ts
import { z } from 'zod'
import { annotateRows } from '~~/server/utils/import.repo'

const bodySchema = z.object({
  rows: z.array(z.array(z.string())).max(5000),
  map: z.object({
    name: z.number().int().nullable(),
    phone: z.number().int().nullable(),
    area: z.number().int().nullable(),
    status: z.number().int().nullable(),
    remarks: z.number().int().nullable(),
  }),
})

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const { rows, map } = bodySchema.parse(await readBody(event))
  const annotated = await annotateRows(ctx, rows, map)
  return {
    rows: annotated,
    summary: {
      total: annotated.length,
      valid: annotated.filter((r) => r.valid && r.duplicate === null).length,
      errors: annotated.filter((r) => !r.valid).length,
      existingDuplicates: annotated.filter((r) => r.duplicate === 'existing').length,
      inBatchDuplicates: annotated.filter((r) => r.duplicate === 'in-batch').length,
    },
  }
})
```

- [ ] **Step 2: Commit endpoint**

Create `server/api/import/commit.post.ts`:
```ts
import { z } from 'zod'
import { commitRows } from '~~/server/utils/import.repo'

const bodySchema = z.object({
  rows: z.array(z.array(z.string())).max(5000),
  map: z.object({
    name: z.number().int().nullable(),
    phone: z.number().int().nullable(),
    area: z.number().int().nullable(),
    status: z.number().int().nullable(),
    remarks: z.number().int().nullable(),
  }),
  includeDuplicates: z.boolean().default(false),
})

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const { rows, map, includeDuplicates } = bodySchema.parse(await readBody(event))
  return commitRows(ctx, rows, map, includeDuplicates)
})
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec nuxi typecheck`
Expected: 0 errors in `server/api/import/*`.

- [ ] **Step 4: Commit**

```bash
git add server/api/import/preview.post.ts server/api/import/commit.post.ts
git commit -m "feat(import): preview + commit API endpoints"
```

---

## Task 5: useImport composable (TDD)

**Files:**
- Create: `app/composables/useImport.ts`
- Test: `app/composables/useImport.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `app/composables/useImport.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { splitHeaderAndBody } from './useImport'

describe('splitHeaderAndBody', () => {
  it('treats the first row as a header when hasHeader is true', () => {
    const grid = [['Name', 'Phone'], ['Dean', '60128975215']]
    expect(splitHeaderAndBody(grid, true)).toEqual({
      header: ['Name', 'Phone'],
      body: [['Dean', '60128975215']],
    })
  })
  it('synthesizes Column N headers when hasHeader is false', () => {
    const grid = [['Dean', '60128975215']]
    expect(splitHeaderAndBody(grid, false)).toEqual({
      header: ['Column 1', 'Column 2'],
      body: [['Dean', '60128975215']],
    })
  })
  it('handles an empty grid', () => {
    expect(splitHeaderAndBody([], true)).toEqual({ header: [], body: [] })
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pnpm vitest run app/composables/useImport.spec.ts`
Expected: FAIL — cannot resolve `./useImport`.

- [ ] **Step 3: Implement**

Create `app/composables/useImport.ts`:
```ts
import type { AnnotatedRow, ColumnMap } from '~~/shared/utils/import'

export interface ImportPreview {
  rows: AnnotatedRow[]
  summary: {
    total: number
    valid: number
    errors: number
    existingDuplicates: number
    inBatchDuplicates: number
  }
}

/** Pure: split a parsed grid into a header row + body, synthesizing headers if needed. */
export function splitHeaderAndBody(
  grid: string[][],
  hasHeader: boolean,
): { header: string[]; body: string[][] } {
  if (!grid.length) return { header: [], body: [] }
  if (hasHeader) return { header: grid[0], body: grid.slice(1) }
  const width = Math.max(...grid.map((r) => r.length))
  const header = Array.from({ length: width }, (_, i) => `Column ${i + 1}`)
  return { header, body: grid }
}

export function useImport() {
  const request = useRequestFetch()
  async function preview(rows: string[][], map: ColumnMap) {
    return request<ImportPreview>('/api/import/preview', { method: 'POST', body: { rows, map } })
  }
  async function commit(rows: string[][], map: ColumnMap, includeDuplicates: boolean) {
    return request<{ inserted: number; skipped: number }>(
      '/api/import/commit',
      { method: 'POST', body: { rows, map, includeDuplicates } },
    )
  }
  return { preview, commit }
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm vitest run app/composables/useImport.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/composables/useImport.ts app/composables/useImport.spec.ts
git commit -m "feat(import): useImport composable + header/body split"
```

---

## Task 6: Import wizard UI + page + nav link

**Files:**
- Create: `app/components/ImportPreviewTable.vue`, `app/components/ImportWizard.vue`, `app/pages/import.vue`
- Modify: `app/layouts/default.vue`

> No unit tests (these compose Nuxt composables). Verified by typecheck + the smoke run in Task 7. Follow `DESIGN.md`: terracotta accent for the primary action only, paper neutrals, mono phone numbers, soft radii, status never color-only.

- [ ] **Step 1: Preview table component**

Create `app/components/ImportPreviewTable.vue`:
```vue
<script setup lang="ts">
import type { AnnotatedRow } from '~~/shared/utils/import'
defineProps<{ rows: AnnotatedRow[] }>()

function rowState(r: AnnotatedRow): { label: string; cls: string } {
  if (!r.valid) return { label: 'Skipped', cls: 'bg-red-50 text-red-700 border-red-200' }
  if (r.duplicate === 'in-batch') return { label: 'Repeat', cls: 'bg-canvas text-faint border-line' }
  if (r.duplicate === 'existing') return { label: 'Duplicate', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: 'New', cls: 'bg-accent-soft text-accent border-line' }
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
    <table class="w-full text-sm">
      <thead class="bg-canvas/60">
        <tr>
          <th class="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Name</th>
          <th class="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Phone</th>
          <th class="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Area</th>
          <th class="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Status</th>
          <th class="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Row</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.index" class="border-t border-line">
          <td class="px-4 py-2.5 font-medium text-ink">{{ r.name || '—' }}</td>
          <td class="px-4 py-2.5 font-mono text-[13px]" :class="r.phoneValid ? 'text-muted' : 'text-red-600'">
            {{ r.phoneE164 || r.phoneRaw || '—' }}
          </td>
          <td class="px-4 py-2.5 text-muted">{{ r.area || '—' }}</td>
          <td class="px-4 py-2.5 text-muted">{{ r.statusLabel || '—' }}</td>
          <td class="px-4 py-2.5">
            <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium" :class="rowState(r).cls">
              {{ rowState(r).label }}
            </span>
            <span v-if="r.error" class="ml-2 text-xs text-red-600">{{ r.error }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

- [ ] **Step 2: Wizard component**

Create `app/components/ImportWizard.vue`:
```vue
<script setup lang="ts">
import { parseDelimited, autoMapColumns, type ColumnMap } from '~~/shared/utils/import'
import type { ImportPreview } from '~/composables/useImport'

const emit = defineEmits<{ imported: [count: number] }>()

const FIELDS: { key: keyof ColumnMap; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'area', label: 'Area' },
  { key: 'status', label: 'Status' },
  { key: 'remarks', label: 'Remarks' },
]

const step = ref<'input' | 'map' | 'preview'>('input')
const raw = ref('')
const hasHeader = ref(true)
const header = ref<string[]>([])
const body = ref<string[][]>([])
const map = ref<ColumnMap>({ name: null, phone: null, area: null, status: null, remarks: null })
const previewData = ref<ImportPreview | null>(null)
const includeDuplicates = ref(false)
const busy = ref(false)
const error = ref('')

const { preview, commit } = useImport()

function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { raw.value = String(reader.result ?? '') }
  reader.readAsText(file)
}

function toMapping() {
  const grid = parseDelimited(raw.value)
  if (!grid.length) { error.value = 'Nothing to import. Paste rows or choose a file.'; return }
  error.value = ''
  const { header: h, body: b } = splitHeaderAndBody(grid, hasHeader.value)
  header.value = h
  body.value = b
  map.value = hasHeader.value ? autoMapColumns(h) : { name: 0, phone: 1, area: null, status: null, remarks: null }
  step.value = 'map'
}

async function toPreview() {
  busy.value = true; error.value = ''
  try {
    previewData.value = await preview(body.value, map.value)
    step.value = 'preview'
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Could not build the preview.'
  } finally { busy.value = false }
}

async function confirmImport() {
  busy.value = true; error.value = ''
  try {
    const res = await commit(body.value, map.value, includeDuplicates.value)
    emit('imported', res.inserted)
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Import failed.'
  } finally { busy.value = false }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Step: input -->
    <section v-if="step === 'input'" class="rounded-lg border border-line bg-surface p-6 shadow-card">
      <h2 class="text-base font-semibold text-ink">Paste your spreadsheet</h2>
      <p class="mt-1 text-sm text-muted">Copy the rows from Google Sheets or Excel and paste below, or choose a CSV file.</p>
      <textarea
        v-model="raw"
        rows="8"
        placeholder="Name	Contact	Area	Status	Remarks"
        class="mt-3 w-full rounded-md border border-line bg-card px-3 py-2 font-mono text-[13px]"
      />
      <div class="mt-3 flex items-center justify-between">
        <label class="flex items-center gap-2 text-sm text-muted">
          <input v-model="hasHeader" type="checkbox" class="accent-[var(--color-accent)]"> First row is a header
        </label>
        <label class="cursor-pointer text-sm text-accent hover:text-accent-strong">
          Choose CSV file
          <input type="file" accept=".csv,text/csv" class="hidden" @change="onFile">
        </label>
      </div>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
      <button class="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px" @click="toMapping">
        Continue
      </button>
    </section>

    <!-- Step: map -->
    <section v-else-if="step === 'map'" class="rounded-lg border border-line bg-surface p-6 shadow-card">
      <h2 class="text-base font-semibold text-ink">Match the columns</h2>
      <p class="mt-1 text-sm text-muted">{{ body.length }} rows found. Tell us which column is which.</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label v-for="f in FIELDS" :key="f.key" class="flex flex-col gap-1">
          <span class="text-xs font-medium text-muted">{{ f.label }}</span>
          <select v-model="map[f.key]" class="rounded-md border border-line bg-card px-3 py-2 text-sm">
            <option :value="null">— not in sheet —</option>
            <option v-for="(h, i) in header" :key="i" :value="i">{{ h || `Column ${i + 1}` }}</option>
          </select>
        </label>
      </div>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
      <div class="mt-4 flex gap-2">
        <button class="rounded-md px-3 py-2 text-sm text-muted hover:text-ink" @click="step = 'input'">Back</button>
        <button :disabled="busy" class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px disabled:opacity-60" @click="toPreview">
          {{ busy ? 'Checking…' : 'Preview' }}
        </button>
      </div>
    </section>

    <!-- Step: preview -->
    <section v-else class="space-y-4">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <span class="font-semibold text-ink">{{ previewData?.summary.valid }} ready to import</span>
        <span v-if="previewData?.summary.existingDuplicates" class="text-amber-700">{{ previewData?.summary.existingDuplicates }} already in your list</span>
        <span v-if="previewData?.summary.inBatchDuplicates" class="text-muted">{{ previewData?.summary.inBatchDuplicates }} repeated in the paste</span>
        <span v-if="previewData?.summary.errors" class="text-red-600">{{ previewData?.summary.errors }} skipped (no name or phone)</span>
      </div>

      <label v-if="previewData?.summary.existingDuplicates" class="flex items-center gap-2 text-sm text-muted">
        <input v-model="includeDuplicates" type="checkbox" class="accent-[var(--color-accent)]"> Import the {{ previewData?.summary.existingDuplicates }} that already exist anyway
      </label>

      <ImportPreviewTable :rows="previewData?.rows ?? []" />

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <div class="flex gap-2">
        <button class="rounded-md px-3 py-2 text-sm text-muted hover:text-ink" @click="step = 'map'">Back</button>
        <button :disabled="busy" class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px disabled:opacity-60" @click="confirmImport">
          {{ busy ? 'Importing…' : 'Import leads' }}
        </button>
      </div>
    </section>
  </div>
</template>
```

- [ ] **Step 3: Import page**

Create `app/pages/import.vue`:
```vue
<script setup lang="ts">
const done = ref<number | null>(null)
function onImported(count: number) {
  done.value = count
}
</script>

<template>
  <div>
    <div class="mb-5">
      <h1 class="text-2xl font-semibold tracking-tight">Import leads</h1>
      <p class="text-sm text-muted">Bring your spreadsheet into the CRM. Phones get cleaned and duplicates flagged automatically.</p>
    </div>

    <div v-if="done !== null" class="rounded-lg border border-line bg-surface p-6 shadow-card">
      <p class="text-ink font-medium">Imported {{ done }} {{ done === 1 ? 'lead' : 'leads' }}.</p>
      <div class="mt-3 flex gap-2">
        <NuxtLink to="/" class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px">View leads</NuxtLink>
        <button class="rounded-md px-3 py-2 text-sm text-muted hover:text-ink" @click="done = null">Import more</button>
      </div>
    </div>

    <ImportWizard v-else @imported="onImported" />
  </div>
</template>
```

- [ ] **Step 4: Add the Import nav link**

In `app/layouts/default.vue`, inside the `<nav>` block, add a second `NuxtLink` right after the existing "Leads" link (match the existing link's classes and active-class):
```vue
        <NuxtLink
          to="/import"
          class="flex items-center gap-2.5 rounded-md px-3 py-2 text-muted hover:bg-canvas hover:text-ink transition-colors"
          active-class="bg-accent-soft text-accent font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Import
        </NuxtLink>
```

- [ ] **Step 5: Type-check + commit**

Run: `pnpm exec nuxi typecheck`
Expected: 0 errors.
```bash
git add app/components/ImportPreviewTable.vue app/components/ImportWizard.vue app/pages/import.vue app/layouts/default.vue
git commit -m "feat(import): wizard UI (paste/map/preview), import page, nav link"
```

---

## Task 7: Full verification + smoke

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `pnpm test:run`
Expected: PASS — all prior specs plus the new `import.spec.ts` (8), `import-draft.spec.ts` (4), `useImport.spec.ts` (3).

- [ ] **Step 2: Type-check + build**

Run: `pnpm exec nuxi typecheck && pnpm build`
Expected: 0 type errors; build completes.

- [ ] **Step 3: Manual smoke (needs the dev server + MySQL)**

```bash
pnpm dev
```
At `http://localhost:3000`, logged in:
1. Go to **Import** in the sidebar.
2. Paste these tab-separated rows (copy as-is) with "First row is a header" checked:
   ```
   Name	Contact	Area	Status	Remarks
   Dean Cheong	60128975215	Petaling Jaya	No Answer	tried twice
   Evelyn Khoo	601162085300	Klang	Spoke - Interested	wants condo
   Dean Cheong	60128975215	Petaling Jaya		(repeat)
   		Ipoh		no contact info
   ```
3. Continue. The mapping screen auto-selects Name/Contact/Area/Status/Remarks. Preview.
4. Expect the summary: **2 ready to import**, **1 repeated in the paste**, **1 skipped (no name or phone)**. The repeated Dean row shows "Repeat"; the empty row shows "Skipped".
5. Click **Import leads**. Land on the success panel ("Imported 2 leads.").
6. Open **Leads** — Dean and Evelyn appear, phones normalized to `+60…`, status set where it matched.
7. Re-run the same import: now Dean and Evelyn show as **Duplicate** (already in your list) and are skipped unless you tick "import anyway".

Expected: all steps behave as described.

- [ ] **Step 4: Commit (if any smoke fixes were needed)**

```bash
git add -A
git commit -m "test(import): smoke fixes"
```
(If no fixes were needed, skip this commit.)

---

## Deferred (not in this plan)

- Saved column-mapping presets, undo-after-import, and import history. Add later if a real agency asks.
- Merging/updating existing leads on duplicate (current behavior: skip, or import a second copy if "import anyway"). Update-on-match is a future enhancement.

## Done criteria

- `pnpm test:run` green (including the 3 new spec files), typecheck 0, build succeeds.
- An agent can paste their sheet, map columns, see a preview with cleaned phones + duplicate/error flags, and import. Re-importing flags existing leads as duplicates and skips them by default.
- Imported leads carry `source = 'import'` and an `imported` activity; phones are server-normalized; status matched by label.
