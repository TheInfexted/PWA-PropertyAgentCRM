# Follow-ups / Due Today Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an agent schedule a callback date on a lead and see a "Due Today" worklist of leads whose follow-up is due or overdue, so leads stop going cold.

**Architecture:** Reuses the existing `next_follow_up_at` column and `updateLead` (both built in Plan 1). Pure date logic in `shared/utils/followup.ts` (unit-tested). A scoped repo query `listDueFollowUps` + a `GET /api/leads/due` endpoint feed a new Due Today page. The lead detail panel gains an editable follow-up date. All visibility-scoped through the existing `whereFor` guard.

**Tech Stack:** Nuxt 4 (Vue 3 + TS), Tailwind v4, Drizzle + MySQL, Vitest. Reuses `useLeads().update`, `useRequestFetch`, `CallButton`/`WhatsAppButton`, the warm `DESIGN.md`.

**Plan:** Plan 3 of the Phase-1 sequence. Spec: `docs/superpowers/specs/2026-05-21-property-crm-core-design.md` (§4.3 screen 3). Builds on Plans 1-2.

**Conventions (all tasks):**
- Run from project root `/Users/brendxn___/Desktop/PWA-PropertyAgentCRM`.
- Tests are `*.spec.ts` next to the code. Single: `pnpm vitest run <path>`. All: `pnpm test:run`.
- Keep `pnpm exec nuxi typecheck` at 0 errors. Commit per task with the message shown; `git add` only the named files (no `git add -A`).
- Aliases: `~~/` = project root, `~/` = `app/`. Follow `DESIGN.md` (terracotta accent for actions only, paper neutrals, mono phones, soft radii, status/state never color-only).

---

## Task 1: Follow-up date helpers (TDD)

**Files:**
- Create: `shared/utils/followup.ts`
- Test: `shared/utils/followup.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/utils/followup.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { followUpState, dateInputToIso, isoToDateInput } from './followup'

const NOW = new Date('2026-06-01T10:00:00.000Z')

describe('followUpState', () => {
  it('is "today" when the date is the same calendar day', () => {
    expect(followUpState('2026-06-01T00:00:00.000Z', NOW)).toBe('today')
  })
  it('is "overdue" when the date is before today', () => {
    expect(followUpState('2026-05-30T00:00:00.000Z', NOW)).toBe('overdue')
  })
  it('is "upcoming" when the date is after today', () => {
    expect(followUpState('2026-06-05T00:00:00.000Z', NOW)).toBe('upcoming')
  })
  it('is null when there is no date', () => {
    expect(followUpState(null, NOW)).toBeNull()
  })
})

describe('dateInputToIso / isoToDateInput', () => {
  it('converts a date input to an ISO datetime at UTC midnight', () => {
    expect(dateInputToIso('2026-06-01')).toBe('2026-06-01T00:00:00.000Z')
  })
  it('returns null for an empty date input', () => {
    expect(dateInputToIso('')).toBeNull()
  })
  it('converts an ISO datetime back to a date input value', () => {
    expect(isoToDateInput('2026-06-01T00:00:00.000Z')).toBe('2026-06-01')
  })
  it('returns empty string for a null ISO', () => {
    expect(isoToDateInput(null)).toBe('')
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pnpm vitest run shared/utils/followup.spec.ts`
Expected: FAIL — cannot resolve `./followup`.

- [ ] **Step 3: Implement**

Create `shared/utils/followup.ts`:
```ts
export type FollowUpState = 'overdue' | 'today' | 'upcoming'

/** Compare a follow-up ISO datetime to `now` by UTC calendar day. null if no/invalid date. */
export function followUpState(iso: string | null, now: Date = new Date()): FollowUpState | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const day = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate())
  const a = day(d)
  const b = day(now)
  if (a < b) return 'overdue'
  if (a === b) return 'today'
  return 'upcoming'
}

/** 'YYYY-MM-DD' -> ISO datetime at UTC midnight. '' -> null. */
export function dateInputToIso(date: string): string | null {
  if (!date) return null
  return `${date}T00:00:00.000Z`
}

/** ISO datetime -> 'YYYY-MM-DD' for an <input type="date">. null/invalid -> ''. */
export function isoToDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm vitest run shared/utils/followup.spec.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/utils/followup.ts shared/utils/followup.spec.ts
git commit -m "feat(followups): pure date-state + input/ISO helpers"
```

---

## Task 2: Due-followups repo query + endpoint

**Files:**
- Modify: `server/utils/leads.repo.ts`
- Create: `server/api/leads/due.get.ts`

> DB-backed; verified by typecheck + smoke. Reuses the existing private `whereFor(ctx, {})` guard so visibility holds (agent sees only their own due leads).

- [ ] **Step 1: Add `isNotNull` to the drizzle import in `server/utils/leads.repo.ts`**

Change the existing line `import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm'` to:
```ts
import { and, asc, desc, eq, isNotNull, like, or, sql } from 'drizzle-orm'
```

- [ ] **Step 2: Append the query to `server/utils/leads.repo.ts`**

```ts
/** Leads with a follow-up due today or overdue (visibility-scoped), oldest first. */
export async function listDueFollowUps(ctx: RequestContext) {
  const db = useDb()
  const where = and(
    whereFor(ctx, {}),
    isNotNull(leads.nextFollowUpAt),
    sql`date(${leads.nextFollowUpAt}) <= curdate()`,
  )
  return db.select().from(leads).where(where).orderBy(asc(leads.nextFollowUpAt)).limit(200)
}
```

- [ ] **Step 3: Create the endpoint `server/api/leads/due.get.ts`**

```ts
import { listDueFollowUps } from '~~/server/utils/leads.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  return listDueFollowUps(ctx)
})
```
(Static `due.get.ts` takes routing precedence over `[id].get.ts`, so `GET /api/leads/due` resolves here.)

- [ ] **Step 4: Type-check**

Run: `pnpm exec nuxi typecheck`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add server/utils/leads.repo.ts server/api/leads/due.get.ts
git commit -m "feat(followups): listDueFollowUps repo query + /api/leads/due endpoint"
```

---

## Task 3: Editable follow-up date in the lead detail panel

**Files:**
- Modify: `app/components/LeadDetailPanel.vue`
- Modify: `app/pages/index.vue`

> Gives the agent a way to schedule (and clear) a callback from a lead. Emits `changed` so the list refreshes.

- [ ] **Step 1: Rewrite `app/components/LeadDetailPanel.vue`**

```vue
<script setup lang="ts">
import { isoToDateInput, dateInputToIso } from '~~/shared/utils/followup'

const props = defineProps<{ leadId: number }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const { data: lead, refresh } = useFetch(`/api/leads/${props.leadId}`, { lazy: true })
const { data: activities } = useFetch(`/api/leads/${props.leadId}/activities`, { lazy: true })
const { update } = useLeads()

const followUp = ref('')
watch(lead, (l) => { followUp.value = isoToDateInput((l as { nextFollowUpAt?: string | null })?.nextFollowUpAt ?? null) })

const saving = ref(false)
async function saveFollowUp(value: string | null) {
  saving.value = true
  try {
    await update(props.leadId, { nextFollowUpAt: value })
    await refresh()
    emit('changed')
  } finally { saving.value = false }
}
</script>

<template>
  <div class="fixed inset-0 z-20 bg-ink/20" @click="emit('close')" />
  <div class="fixed inset-y-0 right-0 z-30 w-96 overflow-y-auto border-l border-line bg-surface p-6 shadow-pop">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-ink">{{ lead?.name || 'Lead' }}</h2>
      <button class="text-faint hover:text-ink" @click="emit('close')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <dl class="space-y-2.5 text-sm">
      <div><dt class="text-xs uppercase tracking-wide text-faint">Phone</dt><dd class="font-mono text-ink">{{ lead?.phoneE164 || lead?.phoneRaw || '—' }}</dd></div>
      <div><dt class="text-xs uppercase tracking-wide text-faint">Area</dt><dd class="text-ink">{{ lead?.area || '—' }}</dd></div>
      <div><dt class="text-xs uppercase tracking-wide text-faint">Remarks</dt><dd class="text-ink">{{ lead?.remarks || '—' }}</dd></div>
    </dl>

    <!-- Follow-up scheduler -->
    <div class="mt-5 rounded-lg border border-line bg-canvas/50 p-3">
      <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint">Next follow-up</label>
      <div class="flex items-center gap-2">
        <input
          v-model="followUp"
          type="date"
          class="flex-1 rounded-md border border-line bg-surface px-3 py-1.5 text-sm"
          :disabled="saving"
          @change="saveFollowUp(dateInputToIso(followUp))"
        >
        <button
          v-if="followUp"
          class="rounded-md px-2.5 py-1.5 text-sm text-muted hover:text-ink"
          :disabled="saving"
          @click="followUp = ''; saveFollowUp(null)"
        >Clear</button>
      </div>
    </div>

    <h3 class="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Activity</h3>
    <ul class="space-y-2 text-xs text-muted">
      <li v-for="a in (activities ?? [])" :key="a.id" class="flex items-center gap-2">
        <span class="h-1.5 w-1.5 rounded-full bg-line" />
        <span>{{ a.type }} · {{ new Date(a.createdAt).toLocaleString() }}</span>
      </li>
    </ul>
  </div>
</template>
```

- [ ] **Step 2: Have the Leads page refresh when the panel reports a change**

In `app/pages/index.vue`, change the `LeadDetailPanel` usage to also refresh on `changed`:
```vue
    <LeadDetailPanel v-if="openId" :lead-id="openId" @close="openId = null" @changed="refresh" />
```

- [ ] **Step 3: Type-check + tests**

Run: `pnpm exec nuxi typecheck && pnpm test:run`
Expected: 0 type errors; all tests pass (no specs for these files).

- [ ] **Step 4: Commit**

```bash
git add app/components/LeadDetailPanel.vue app/pages/index.vue
git commit -m "feat(followups): schedule/clear a follow-up date from the lead detail panel"
```

---

## Task 4: Due Today page + nav link

**Files:**
- Create: `app/composables/useFollowUps.ts`, `app/components/DueList.vue`, `app/pages/due.vue`
- Modify: `app/layouts/default.vue`

- [ ] **Step 1: Composable**

Create `app/composables/useFollowUps.ts`:
```ts
import { dateInputToIso } from '~~/shared/utils/followup'

export interface DueLead {
  id: number
  name: string
  phoneE164: string | null
  phoneRaw: string | null
  area: string
  statusId: number | null
  nextFollowUpAt: string | null
}

export function useFollowUps() {
  const request = useRequestFetch()
  const { update } = useLeads()
  async function listDue() {
    return request<DueLead[]>('/api/leads/due')
  }
  async function reschedule(id: number, date: string) {
    return update(id, { nextFollowUpAt: dateInputToIso(date) })
  }
  async function markDone(id: number) {
    return update(id, { nextFollowUpAt: null })
  }
  return { listDue, reschedule, markDone }
}
```

- [ ] **Step 2: Due list component**

Create `app/components/DueList.vue`:
```vue
<script setup lang="ts">
import { followUpState, isoToDateInput } from '~~/shared/utils/followup'
import type { DueLead } from '~/composables/useFollowUps'

defineProps<{ rows: DueLead[] }>()
const emit = defineEmits<{ done: [id: number]; reschedule: [id: number, date: string] }>()

function stateBadge(iso: string | null): { label: string; cls: string } {
  const s = followUpState(iso)
  if (s === 'overdue') return { label: 'Overdue', cls: 'bg-red-50 text-red-700 border-red-200' }
  return { label: 'Today', cls: 'bg-accent-soft text-accent border-line' }
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
    <table class="w-full text-sm">
      <thead class="bg-canvas/60">
        <tr>
          <th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Name</th>
          <th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Phone</th>
          <th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Area</th>
          <th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Due</th>
          <th class="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" class="border-t border-line hover:bg-accent-soft/40">
          <td class="px-5 py-3.5 font-medium text-ink">{{ row.name || '—' }}</td>
          <td class="px-5 py-3.5 font-mono text-[13px] text-muted">{{ row.phoneE164 || row.phoneRaw || '—' }}</td>
          <td class="px-5 py-3.5 text-muted">{{ row.area || '—' }}</td>
          <td class="px-5 py-3.5">
            <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium" :class="stateBadge(row.nextFollowUpAt).cls">
              {{ stateBadge(row.nextFollowUpAt).label }}
            </span>
          </td>
          <td class="px-5 py-3.5">
            <div class="flex items-center justify-end gap-2">
              <CallButton :e164="row.phoneE164" />
              <WhatsAppButton :e164="row.phoneE164" />
              <input
                type="date"
                :value="isoToDateInput(row.nextFollowUpAt)"
                class="rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted"
                @change="emit('reschedule', row.id, ($event.target as HTMLInputElement).value)"
              >
              <button class="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-muted hover:text-ink hover:border-line-strong" @click="emit('done', row.id)">Done</button>
            </div>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="5" class="py-16 text-center">
            <div class="flex flex-col items-center gap-3">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-faint">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              <div>
                <p class="font-medium text-ink">Nothing due</p>
                <p class="mt-0.5 text-sm text-faint">No callbacks are due today. Schedule one from a lead's detail panel.</p>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

- [ ] **Step 3: Due page**

Create `app/pages/due.vue`:
```vue
<script setup lang="ts">
const { listDue, reschedule, markDone } = useFollowUps()
const { data, refresh } = await useAsyncData('due-followups', () => listDue())

async function onDone(id: number) {
  await markDone(id)
  await refresh()
}
async function onReschedule(id: number, date: string) {
  if (!date) return
  await reschedule(id, date)
  await refresh()
}
</script>

<template>
  <DueList
    :rows="(data ?? []) as any"
    @done="onDone"
    @reschedule="onReschedule"
  />
</template>
```

- [ ] **Step 4: Add the nav link + title**

In `app/layouts/default.vue`:
(a) add `'/due': 'Due Today'` to the `titles` map so it becomes `const titles: Record<string, string> = { '/': 'Leads', '/import': 'Import', '/due': 'Due Today' }`.
(b) add this `NuxtLink` inside `<nav>`, immediately after the Leads link and before the Import link:
```vue
        <NuxtLink
          to="/due"
          class="flex items-center gap-2.5 rounded-md px-3 py-2 text-muted transition-colors hover:bg-canvas hover:text-ink"
          active-class="bg-accent-soft text-accent font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>
          </svg>
          Due Today
        </NuxtLink>
```

- [ ] **Step 5: Type-check + tests + build**

Run: `pnpm exec nuxi typecheck && pnpm test:run && pnpm build`
Expected: 0 type errors; tests pass; build completes.

- [ ] **Step 6: Commit**

```bash
git add app/composables/useFollowUps.ts app/components/DueList.vue app/pages/due.vue app/layouts/default.vue
git commit -m "feat(followups): Due Today page, list, composable, nav link"
```

---

## Task 5: Full verification + smoke

**Files:** none (verification only)

- [ ] **Step 1: Full unit suite**

Run: `pnpm test:run`
Expected: PASS — all prior specs plus `followup.spec.ts` (8).

- [ ] **Step 2: Type-check + build**

Run: `pnpm exec nuxi typecheck && pnpm build`
Expected: 0 type errors; build completes.

- [ ] **Step 3: Manual smoke (needs dev server + MySQL)**

```bash
pnpm dev
```
Logged in at `http://localhost:3000`:
1. Open a lead (click its name) → in the detail panel, set **Next follow-up** to today's date. Close.
2. Click **Due Today** in the sidebar → the lead appears with a "Today" badge.
3. Set another lead's follow-up to yesterday → it appears as "Overdue".
4. On the Due Today row, click **Done** → the lead drops off the list (follow-up cleared).
5. Reschedule a row to a future date → it drops off the list (no longer due).
6. Call / WhatsApp buttons on the Due Today rows work.

Expected: all steps behave as described.

- [ ] **Step 4: Commit (only if smoke fixes were needed)**

```bash
git add -A
git commit -m "test(followups): smoke fixes"
```

---

## Deferred (not in this plan)

- A live count badge on the "Due Today" nav item. Add once the base flow is validated.
- Timezone handling: "today" uses UTC (helpers) / the DB server timezone (`curdate()`). Fine for a single-region deploy; revisit if used across timezones.
- Reminders/notifications (email or push) for due follow-ups. Future.

## Done criteria

- `pnpm test:run` green (incl. `followup.spec.ts`), typecheck 0, build succeeds.
- An agent can set a follow-up date on a lead, see due/overdue leads on a Due Today screen, and mark done or reschedule from there, with Call/WhatsApp one tap away. Everything visibility-scoped.
