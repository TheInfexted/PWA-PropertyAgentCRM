# Phase-1 Correctness Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax. After EACH task, the orchestrator self-reviews the diff + runs typecheck/tests before continuing.

**Goal:** Fix the 10 findings from the full-system audit — led by the timezone "Due Today" off-by-one — without regressing anything.

**Tech Stack:** Nuxt 4, Drizzle + MySQL, Vitest. Branch: `feat/hardening`.

**Conventions:** Run from project root. Tests `*.spec.ts`. `pnpm vitest run <path>` (single), `pnpm test:run` (all), `pnpm exec nuxi typecheck` (keep 0). Commit per task, `git add` only named files. Aliases `~~/` root, `~/` app.

**Deploy note:** Task 1 adds migration `0003` (follow-up column → DATE), so the next deploy MUST run `pnpm db:migrate`.

---

## Task 1 — Follow-up dates are calendar days, not UTC instants (fixes #1, HIGH)

**Problem:** Follow-ups are stored at UTC midnight, the due query uses MySQL-session-local `curdate()`, and the client badge uses UTC day — three clocks. Fix: store a **DATE** (calendar day, no time, no tz); compare day-to-day on both sides.

**Files:** `server/db/schema.ts`, migration `0003` (generated), `shared/utils/followup.ts` (+ `.spec.ts`), `shared/schemas/lead.ts`, `server/utils/leads.repo.ts`, `app/composables/useFollowUps.ts`, `app/components/LeadDetailPanel.vue`, `app/components/DueList.vue`.

- [ ] **Step 1: Schema → DATE.** In `server/db/schema.ts` add `date` to the `drizzle-orm/mysql-core` import (it already imports `mediumtext`), and change the leads column:
  - from `nextFollowUpAt: timestamp('next_follow_up_at'),`
  - to `nextFollowUpAt: date('next_follow_up_at', { mode: 'string' }),`
  (Leave the `idx_lead_ws_follow` index as-is.)

- [ ] **Step 2: Generate migration.** `pnpm db:generate` → expect `0003_*.sql` containing `ALTER TABLE \`leads\` MODIFY COLUMN \`next_follow_up_at\` date;` (+ updated meta). Commit the whole `server/db/migrations` dir.

- [ ] **Step 3: Rewrite `shared/utils/followup.spec.ts`** (date-string semantics, TZ-deterministic `now`):
```ts
import { describe, it, expect } from 'vitest'
import { followUpState, todayStr, dateInputToStored, storedToDateInput } from './followup'

// Local noon so the local calendar date is deterministic regardless of the runner TZ.
const NOW = new Date(2026, 5, 1, 12, 0, 0)

describe('followUpState', () => {
  it('is "today" on the same calendar day', () => expect(followUpState('2026-06-01', NOW)).toBe('today'))
  it('is "overdue" before today', () => expect(followUpState('2026-05-30', NOW)).toBe('overdue'))
  it('is "upcoming" after today', () => expect(followUpState('2026-06-05', NOW)).toBe('upcoming'))
  it('is null with no date', () => expect(followUpState(null, NOW)).toBeNull())
})

describe('todayStr', () => {
  it('formats the local date as YYYY-MM-DD', () => expect(todayStr(NOW)).toBe('2026-06-01'))
})

describe('dateInputToStored / storedToDateInput', () => {
  it('passes a date input through, empty -> null', () => {
    expect(dateInputToStored('2026-06-01')).toBe('2026-06-01')
    expect(dateInputToStored('')).toBeNull()
  })
  it('reads a stored date back for the input; tolerates legacy ISO; null -> ""', () => {
    expect(storedToDateInput('2026-06-01')).toBe('2026-06-01')
    expect(storedToDateInput('2026-06-01T00:00:00.000Z')).toBe('2026-06-01')
    expect(storedToDateInput(null)).toBe('')
  })
})
```

- [ ] **Step 4: Run — expect FAIL** (`todayStr`/`dateInputToStored`/`storedToDateInput` not exported). `pnpm vitest run shared/utils/followup.spec.ts`

- [ ] **Step 5: Rewrite `shared/utils/followup.ts`:**
```ts
export type FollowUpState = 'overdue' | 'today' | 'upcoming'

/** Today's calendar date as 'YYYY-MM-DD' in the LOCAL timezone. */
export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Compare a 'YYYY-MM-DD' follow-up date to today (local). null if no date. */
export function followUpState(date: string | null, now: Date = new Date()): FollowUpState | null {
  if (!date) return null
  const today = todayStr(now)
  if (date < today) return 'overdue'
  if (date === today) return 'today'
  return 'upcoming'
}

/** '<input type=date>' value -> stored value. '' -> null. */
export function dateInputToStored(date: string): string | null {
  return date || null
}

/** Stored value -> '<input type=date>' value. Tolerates legacy ISO; null/'' -> ''. */
export function storedToDateInput(value: string | null): string {
  if (!value) return ''
  return value.length > 10 ? value.slice(0, 10) : value
}
```

- [ ] **Step 6: Run — expect PASS.** `pnpm vitest run shared/utils/followup.spec.ts`

- [ ] **Step 7: Lead schema accepts a date (or legacy datetime).** In `shared/schemas/lead.ts`, change the `nextFollowUpAt` field:
  - from `nextFollowUpAt: z.string().datetime().nullable().optional(),`
  - to `nextFollowUpAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Expected a YYYY-MM-DD date').nullable().optional(),`

- [ ] **Step 8: Store the date in `server/utils/leads.repo.ts`.**
  - `createLead`: change `nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,` → `nextFollowUpAt: data.nextFollowUpAt ? data.nextFollowUpAt.slice(0, 10) : null,`
  - `updateLead`: change `if (data.nextFollowUpAt !== undefined) patch.nextFollowUpAt = data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null` → `if (data.nextFollowUpAt !== undefined) patch.nextFollowUpAt = data.nextFollowUpAt ? data.nextFollowUpAt.slice(0, 10) : null`
  - `listDueFollowUps`: change the predicate `sql\`date(${leads.nextFollowUpAt}) <= curdate()\`` → `sql\`${leads.nextFollowUpAt} <= curdate()\`` (column is already a DATE).

- [ ] **Step 9: Update the three consumers.**
  - `app/composables/useFollowUps.ts`: change the import `import { dateInputToIso } from '~~/shared/utils/followup'` → `import { dateInputToStored } from '~~/shared/utils/followup'`, and `reschedule` body → `return update(id, { nextFollowUpAt: dateInputToStored(date) })`.
  - `app/components/LeadDetailPanel.vue`: change the import `import { isoToDateInput, dateInputToIso } from '~~/shared/utils/followup'` → `import { storedToDateInput, dateInputToStored } from '~~/shared/utils/followup'`; in the `watch(lead, …)` use `storedToDateInput((l as { nextFollowUpAt?: string | null })?.nextFollowUpAt ?? null)`; in the template `@change="saveFollowUp(dateInputToStored(followUp))"`.
  - `app/components/DueList.vue`: change `import { followUpState, isoToDateInput } from '~~/shared/utils/followup'` → `import { followUpState, storedToDateInput } from '~~/shared/utils/followup'`; rename the `stateBadge(iso)` param to `date` (behaviour identical, it just calls `followUpState(date)`); change the input `:value="isoToDateInput(row.nextFollowUpAt)"` → `:value="storedToDateInput(row.nextFollowUpAt)"`.

- [ ] **Step 10: Typecheck + tests + build + commit.** `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; pass; build ok).
```bash
git add server/db/schema.ts server/db/migrations shared/utils/followup.ts shared/utils/followup.spec.ts shared/schemas/lead.ts server/utils/leads.repo.ts app/composables/useFollowUps.ts app/components/LeadDetailPanel.vue app/components/DueList.vue
git commit -m "fix(followups): store follow-up as a calendar DATE (fixes Due Today timezone off-by-one)"
```
> **Operational note for the report:** set the VPS + MySQL timezone to the business timezone (e.g. `Asia/Kuala_Lumpur`) so server `curdate()` and the browser's local "today" agree.

---

## Task 2 — Validate statusId belongs to the workspace + scope writes (fixes #4 MED, #9 LOW)

**Files:** `server/utils/leads.repo.ts`.

- [ ] **Step 1: Add a status-ownership guard + use the visibility scope for writes.** In `server/utils/leads.repo.ts`:
  - Add `statuses` to the schema import: `import { leads, activities, statuses } from '~~/server/db/schema'`.
  - Add this helper (after `applyPhone`):
```ts
/** Throws 400 if statusId is set but does not belong to the caller's workspace. */
async function assertStatusInWorkspace(ctx: RequestContext, statusId: number | null | undefined) {
  if (statusId == null) return
  const db = useDb()
  const [s] = await db.select({ id: statuses.id }).from(statuses)
    .where(and(eq(statuses.workspaceId, ctx.workspaceId), eq(statuses.id, statusId))).limit(1)
  if (!s) throw createError({ statusCode: 400, message: 'Invalid status for this workspace' })
}
```
  - In `createLead`, before the insert: `await assertStatusInWorkspace(ctx, data.statusId)`.
  - In `updateLead`, before building `patch` (or right after the `existing` null-check): `if (data.statusId !== undefined) await assertStatusInWorkspace(ctx, data.statusId)`.
  - In `bulkSetStatus`, before the update: `await assertStatusInWorkspace(ctx, statusId)`.
  - **Defense-in-depth (#9):** change `deleteLead`'s where to `and(whereFor(ctx, {}), eq(leads.id, id))` and `updateLead`'s final update where to `and(whereFor(ctx, {}), eq(leads.id, id))` (so the SQL itself is visibility-scoped, not just the upstream `getLead`). `whereFor` is already defined in this file.

- [ ] **Step 2: Typecheck + tests + commit.** `pnpm exec nuxi typecheck && pnpm test:run` (0; pass).
```bash
git add server/utils/leads.repo.ts
git commit -m "fix(leads): validate statusId belongs to workspace; scope lead writes via visibility guard"
```

---

## Task 3 — Import no longer assumes contiguous auto-increment IDs (fixes #3 MED)

**Files:** `server/utils/leads.repo.ts`.

- [ ] **Step 1: Make `bulkCreateLeads` transactional + re-query the real ids.** Add `gte` to the drizzle import (`import { and, asc, desc, eq, gte, inArray, isNotNull, like, or, sql } from 'drizzle-orm'`). Replace the body of `bulkCreateLeads` (after building `values`) with:
```ts
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
```
(Remove the old `firstId + i` mapping and its comment.)

- [ ] **Step 2: Typecheck + tests + commit.** `pnpm exec nuxi typecheck && pnpm test:run` (0; pass).
```bash
git add server/utils/leads.repo.ts
git commit -m "fix(import): attach imported-activities by actual inserted ids in a transaction (no contiguity assumption)"
```

---

## Task 4 — Settings changes refresh the shared workspace-settings cache (fixes #2 MED)

**Files:** `app/pages/settings.vue`.

- [ ] **Step 1:** In `app/pages/settings.vue` `<script setup>`, after `const settings = useSettings()`, add `const wsSettings = useWorkspaceSettings()`. Then in `persistSettings()`, after the `await settings.updateSettings(...)` line and `await refreshWs()`, add `await wsSettings.load(true)` so the shared `ws-settings` state used by the leads table / add-lead form / detail panel is refreshed immediately (no full reload needed).

- [ ] **Step 2: Typecheck + tests + build + commit.** `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; pass; build ok).
```bash
git add app/pages/settings.vue
git commit -m "fix(settings): refresh shared workspace-settings cache after optional-field/area edits"
```

---

## Task 5 — Import dedupes invalid-phone and phoneless rows (fixes #5 LOW, TDD)

**Files:** `shared/utils/import.ts` (+ its spec), `server/utils/import.repo.ts`.

- [ ] **Step 1: Add failing tests** for a `dupeKey` helper and the broadened `markInBatchDupes`. In `shared/utils/import.ts`'s spec file (find it, likely `shared/utils/import.spec.ts`), add:
```ts
describe('dupeKey', () => {
  it('keys by e164 when valid', () => {
    expect(dupeKey({ phoneE164: '+60123456789', phoneRaw: '012-3456789', name: 'A' })).toBe('e:+60123456789')
  })
  it('falls back to raw digits for an invalid phone', () => {
    expect(dupeKey({ phoneE164: null, phoneRaw: '012-xx', name: 'A' })).toBe('d:012')
  })
  it('falls back to the lowercased name when there is no phone', () => {
    expect(dupeKey({ phoneE164: null, phoneRaw: '', name: ' Ali ' })).toBe('n:ali')
  })
  it('is null when there is neither phone nor name', () => {
    expect(dupeKey({ phoneE164: null, phoneRaw: '', name: '' })).toBeNull()
  })
})

describe('markInBatchDupes (broadened)', () => {
  it('flags invalid-but-identical phones and phoneless same-name repeats', () => {
    const rows = [
      { phoneE164: null, phoneRaw: '012-x', name: 'Ali', duplicate: null as 'in-batch' | 'existing' | null },
      { phoneE164: null, phoneRaw: '012x', name: 'Ali2', duplicate: null as 'in-batch' | 'existing' | null },
      { phoneE164: null, phoneRaw: '', name: 'Bob', duplicate: null as 'in-batch' | 'existing' | null },
      { phoneE164: null, phoneRaw: '', name: 'bob', duplicate: null as 'in-batch' | 'existing' | null },
    ]
    markInBatchDupes(rows)
    expect(rows[1].duplicate).toBe('in-batch') // same digits "012"
    expect(rows[3].duplicate).toBe('in-batch') // same name
    expect(rows[0].duplicate).toBeNull()
    expect(rows[2].duplicate).toBeNull()
  })
})
```
(Add `dupeKey` to the existing `import` from `./import` in that spec.)

- [ ] **Step 2: Run — expect FAIL.** `pnpm vitest run shared/utils/import.spec.ts`

- [ ] **Step 3: Implement in `shared/utils/import.ts`.** Add:
```ts
/** Dedupe key: valid e164, else raw digits, else lowercased name, else null (un-dedupable). */
export function dupeKey(r: { phoneE164: string | null; phoneRaw: string; name: string }): string | null {
  if (r.phoneE164) return `e:${r.phoneE164}`
  const digits = (r.phoneRaw || '').replace(/[^\d]/g, '')
  if (digits) return `d:${digits}`
  const name = r.name.trim().toLowerCase()
  if (name) return `n:${name}`
  return null
}
```
Change `markInBatchDupes` to use it (and widen its param type):
```ts
/** Mutates rows in place: second+ occurrence of a dedupe key within the batch is 'in-batch'. */
export function markInBatchDupes(rows: Array<Pick<AnnotatedRow, 'phoneE164' | 'phoneRaw' | 'name' | 'duplicate'>>): void {
  const seen = new Set<string>()
  for (const r of rows) {
    const key = dupeKey(r)
    if (!key) continue
    if (seen.has(key)) r.duplicate = 'in-batch'
    else seen.add(key)
  }
}
```

- [ ] **Step 4: Run — expect PASS.** `pnpm vitest run shared/utils/import.spec.ts` (and confirm the existing parser/auto-map tests still pass).

- [ ] **Step 5: Confirm `server/utils/import.repo.ts` still compiles** — `annotateRows` passes the full annotated rows to `markInBatchDupes(annotated)`, which now have `phoneRaw`/`name`, so no change is needed there. (Existing-workspace dupe detection stays phone-based — leave it.) Verify with typecheck.

- [ ] **Step 6: Typecheck + tests + commit.** `pnpm exec nuxi typecheck && pnpm test:run` (0; pass).
```bash
git add shared/utils/import.ts shared/utils/import.spec.ts
git commit -m "fix(import): dedupe invalid-phone (by digits) and phoneless (by name) rows in-batch"
```

---

## Task 6 — Small fixes: budget order (TDD), middleware perf, seed visibility (fixes #7, #6, #8 LOW)

**Files:** `shared/schemas/lead.ts` (+ spec), `app/middleware/auth.global.ts`, `server/db/seed.ts`.

- [ ] **Step 1: Failing budget test.** In `shared/schemas/lead.spec.ts`, add:
```ts
describe('budget ordering', () => {
  it('rejects budgetMin > budgetMax on create', () => {
    expect(leadInputSchema.safeParse({ name: 'A', budgetMin: 900000, budgetMax: 100 }).success).toBe(false)
  })
  it('accepts budgetMin <= budgetMax on create', () => {
    expect(leadInputSchema.safeParse({ name: 'A', budgetMin: 100, budgetMax: 900000 }).success).toBe(true)
  })
  it('rejects budgetMin > budgetMax on patch', () => {
    expect(leadPatchSchema.safeParse({ budgetMin: 5, budgetMax: 1 }).success).toBe(false)
  })
})
```
(Ensure `leadInputSchema` and `leadPatchSchema` are in the spec's import from `./lead`.)

- [ ] **Step 2: Run — expect FAIL.** `pnpm vitest run shared/schemas/lead.spec.ts`

- [ ] **Step 3: Add the cross-field refine in `shared/schemas/lead.ts`** WITHOUT touching `leadFields` (it must stay a plain object so `.partial()` works). Add a shared predicate and chain it onto both exported schemas:
```ts
const budgetOrdered = (d: { budgetMin?: number | null; budgetMax?: number | null }) =>
  d.budgetMin == null || d.budgetMax == null || d.budgetMin <= d.budgetMax

export const leadInputSchema = leadFields
  .refine((d) => Boolean(d.name?.length) || Boolean(d.phone?.length), { message: 'A lead needs at least a name or a phone', path: ['name'] })
  .refine(budgetOrdered, { message: 'Budget min must be ≤ budget max', path: ['budgetMax'] })

export const leadPatchSchema = leadFields.partial().refine(budgetOrdered, { message: 'Budget min must be ≤ budget max', path: ['budgetMax'] })
```
(Replace the existing `leadInputSchema`/`leadPatchSchema` definitions with these; keep `leadFields` and the type exports unchanged.)

- [ ] **Step 4: Run — expect PASS.** `pnpm vitest run shared/schemas/lead.spec.ts`

- [ ] **Step 5: Middleware perf (#6).** Replace `app/middleware/auth.global.ts` body so the unauthenticated `/api/auth/state` COUNT only runs when logged-out:
```ts
export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/setup']
  const isPublic = (path: string) => publicRoutes.includes(path) || path.startsWith('/invite/')
  const { loggedIn, fetch: fetchSession } = useUserSession()
  await fetchSession()

  if (loggedIn.value) {
    if (isPublic(to.path)) return navigateTo('/')
    return
  }

  const { needsSetup } = await $fetch<{ needsSetup: boolean }>('/api/auth/state')
  if (needsSetup && to.path !== '/setup') return navigateTo('/setup')
  if (!needsSetup && to.path === '/setup') return navigateTo('/login')
  if (!isPublic(to.path)) return navigateTo('/login')
})
```

- [ ] **Step 6: Seed visibility (#8).** Seeded leads currently have a null `assignedTo`, so they're invisible to agent accounts. Assign them to the workspace owner. In `server/db/seed.ts`:
  - After `const [ws] = ...` (and before the loop), load the owner membership: `const [owner] = await db.select().from(schema.workspaceMembers).where(eq(schema.workspaceMembers.workspaceId, ws.id)).limit(1)`
  - In the `db.insert(schema.leads).values({...})` object, add two fields: `assignedTo: owner?.userId ?? null,` and `createdBy: owner?.userId ?? null,`
  (`eq` is already imported from `drizzle-orm` in this file.)

- [ ] **Step 7: Typecheck + tests + build + commit.** `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; pass; build ok).
```bash
git add shared/schemas/lead.ts shared/schemas/lead.spec.ts app/middleware/auth.global.ts server/db/seed.ts
git commit -m "fix: budgetMin<=budgetMax validation, skip auth-state COUNT when logged in, seed assigns leads to owner"
```

---

## Task 7 — PWA update behaviour (addresses #10 LOW)

**Decision (no behaviour change):** `@vite-pwa/nuxt` with `registerType: 'autoUpdate'` already sets Workbox `skipWaiting` + `clientsClaim`, so a new service worker activates and claims clients automatically — the "stale for one session" window is minimal and self-heals on the next navigation. Switching to `prompt` would make users click to update and could leave them MORE stale, which is worse for a demo. So the correct action is to keep `autoUpdate`.

- [ ] **Step 1:** Add a clarifying comment in `nuxt.config.ts` above the `pwa` block documenting that `autoUpdate` (skipWaiting + clientsClaim) is intentional and why. No functional change.
- [ ] **Step 2: Commit.**
```bash
git add nuxt.config.ts
git commit -m "docs(pwa): document autoUpdate (skipWaiting+clientsClaim) as the intentional update strategy"
```

---

## Task 8 — Full verification + smoke + merge

- [ ] **Step 1:** `pnpm test:run` — all pass (incl. new followup/lead/import specs). `pnpm exec nuxi typecheck` — 0. `pnpm build` — completes.
- [ ] **Step 2: Smoke (dev + MySQL, after `pnpm db:migrate`):**
  1. Set a follow-up date on a lead; reload — the date round-trips exactly (no off-by-one). It appears in **Due Today** when it's today/overdue, and the badge agrees.
  2. Reassign/bulk operations still work; setting a status from another workspace via a crafted request is rejected (400).
  3. Import a sheet with duplicate phoneless rows and invalid-but-identical phones → the preview flags them as in-batch dupes; committing inserts the right count and the activity log entries map to the correct leads.
  4. Toggle an optional field in Settings → it shows on the leads table / add-lead form **without** a full reload.
  5. Navigation feels snappier (no per-route users COUNT when logged in); agent still sees only their leads.
- [ ] **Step 3: Merge.**
```bash
git checkout master && git merge --ff-only feat/hardening && git branch -d feat/hardening
```

## Done criteria
- All tests green, typecheck 0, build ok. The 4 correctness/integrity findings (#1–#4) and the LOW items (#5–#9) are fixed; #10 is a documented intentional decision. Deploy runs migration `0003`.
