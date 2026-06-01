# Settings: Status Management + Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an Owner manage their workspace's status list (add, rename, recolor, reorder, delete) and rename the workspace, from a Settings page.

**Architecture:** Owner-only CRUD on the existing per-workspace `statuses` table + a workspace rename, all visibility-scoped by `workspaceId` and gated by a new `requireOwner(ctx)` guard. Pure validation/helpers in `shared/schemas/status.ts` (unit-tested). A Settings page edits statuses inline and persists each change.

**Tech Stack:** Nuxt 4 (Vue 3 + TS), Tailwind v4, Drizzle + MySQL, Vitest. Reuses `requireContext`, `useStatuses`, `useRequestFetch`, the warm `DESIGN.md`.

**Plan:** Plan 4 of the Phase-1 sequence. Spec: `docs/superpowers/specs/2026-05-21-property-crm-core-design.md` (§4.2, §4.3 screen 5). Builds on Plans 1-3.

**Conventions (all tasks):**
- Run from project root `/Users/brendxn___/Desktop/PWA-PropertyAgentCRM`.
- Tests `*.spec.ts` next to code. Single: `pnpm vitest run <path>`. All: `pnpm test:run`. Keep `pnpm exec nuxi typecheck` at 0.
- Commit per task; `git add` only the named files (no `-A`). Aliases `~~/` root, `~/` app. Follow `DESIGN.md`.

---

## Task 1: Status schemas + sort helper (TDD)

**Files:**
- Create: `shared/schemas/status.ts`
- Test: `shared/schemas/status.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/schemas/status.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { statusCreateSchema, statusUpdateSchema, reorderSchema, nextSortOrder } from './status'

describe('statusCreateSchema', () => {
  it('accepts a label with a default colour', () => {
    const r = statusCreateSchema.safeParse({ label: 'Viewing' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.color).toBe('#9e5733')
  })
  it('rejects an empty label', () => {
    expect(statusCreateSchema.safeParse({ label: '' }).success).toBe(false)
  })
  it('rejects a non-hex colour', () => {
    expect(statusCreateSchema.safeParse({ label: 'X', color: 'red' }).success).toBe(false)
  })
})

describe('statusUpdateSchema', () => {
  it('allows a partial update (colour only)', () => {
    expect(statusUpdateSchema.safeParse({ color: '#15803d' }).success).toBe(true)
  })
})

describe('reorderSchema', () => {
  it('accepts an array of ids', () => {
    expect(reorderSchema.safeParse({ ids: [3, 1, 2] }).success).toBe(true)
  })
})

describe('nextSortOrder', () => {
  it('is 0 for an empty list', () => {
    expect(nextSortOrder([])).toBe(0)
  })
  it('is max + 1 otherwise', () => {
    expect(nextSortOrder([{ sortOrder: 0 }, { sortOrder: 4 }, { sortOrder: 2 }])).toBe(5)
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pnpm vitest run shared/schemas/status.spec.ts`
Expected: FAIL — cannot resolve `./status`.

- [ ] **Step 3: Implement**

Create `shared/schemas/status.ts`:
```ts
import { z } from 'zod'

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a #rrggbb colour')

export const statusCreateSchema = z.object({
  label: z.string().trim().min(1).max(80),
  color: hex.default('#9e5733'),
})

export const statusUpdateSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  color: hex.optional(),
})

export const reorderSchema = z.object({
  ids: z.array(z.number().int().positive()).max(100),
})

export type StatusCreate = z.infer<typeof statusCreateSchema>
export type StatusUpdate = z.infer<typeof statusUpdateSchema>

/** Next sort_order = max existing + 1 (0 when empty). */
export function nextSortOrder(existing: { sortOrder: number }[]): number {
  if (!existing.length) return 0
  return Math.max(...existing.map((s) => s.sortOrder)) + 1
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm vitest run shared/schemas/status.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/schemas/status.ts shared/schemas/status.spec.ts
git commit -m "feat(settings): status schemas + nextSortOrder helper"
```

---

## Task 2: Owner guard + status/workspace repos

**Files:**
- Modify: `server/utils/context.ts`, `server/utils/statuses.repo.ts`
- Create: `server/utils/workspace.repo.ts`

> DB-backed; verified by typecheck. Mutations are owner-only (guard in Task 3 endpoints); every query is `workspaceId`-scoped.

- [ ] **Step 1: Add an owner guard to `server/utils/context.ts`**

Append:
```ts
export function requireOwner(ctx: RequestContext) {
  if (ctx.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Only the workspace owner can do that' })
  }
}
```

- [ ] **Step 2: Add status mutations to `server/utils/statuses.repo.ts`**

The file currently imports `{ asc, eq }` from `drizzle-orm`, `{ statuses }` from schema, and type `RequestContext`. Change the schema import to also pull `leads`, and the drizzle import to add `and`:
```ts
import { and, asc, eq } from 'drizzle-orm'
import { statuses, leads } from '~~/server/db/schema'
```
Append:
```ts
import { nextSortOrder, type StatusCreate, type StatusUpdate } from '~~/shared/schemas/status'

export async function createStatus(ctx: RequestContext, data: StatusCreate) {
  const db = useDb()
  const existing = await db.select({ sortOrder: statuses.sortOrder }).from(statuses)
    .where(eq(statuses.workspaceId, ctx.workspaceId))
  const [res] = await db.insert(statuses).values({
    workspaceId: ctx.workspaceId,
    label: data.label,
    color: data.color,
    sortOrder: nextSortOrder(existing),
  })
  const [row] = await db.select().from(statuses)
    .where(and(eq(statuses.workspaceId, ctx.workspaceId), eq(statuses.id, res.insertId))).limit(1)
  return row ?? null
}

export async function updateStatus(ctx: RequestContext, id: number, patch: StatusUpdate) {
  const db = useDb()
  await db.update(statuses).set(patch)
    .where(and(eq(statuses.workspaceId, ctx.workspaceId), eq(statuses.id, id)))
  const [row] = await db.select().from(statuses)
    .where(and(eq(statuses.workspaceId, ctx.workspaceId), eq(statuses.id, id))).limit(1)
  return row ?? null
}

/** Delete a status; leads using it fall back to no status. */
export async function deleteStatus(ctx: RequestContext, id: number) {
  const db = useDb()
  await db.update(leads).set({ statusId: null })
    .where(and(eq(leads.workspaceId, ctx.workspaceId), eq(leads.statusId, id)))
  await db.delete(statuses)
    .where(and(eq(statuses.workspaceId, ctx.workspaceId), eq(statuses.id, id)))
}

/** Set sortOrder = position in `ids` for each status in this workspace. */
export async function reorderStatuses(ctx: RequestContext, ids: number[]) {
  const db = useDb()
  for (let i = 0; i < ids.length; i++) {
    await db.update(statuses).set({ sortOrder: i })
      .where(and(eq(statuses.workspaceId, ctx.workspaceId), eq(statuses.id, ids[i]!)))
  }
}
```

- [ ] **Step 3: Create `server/utils/workspace.repo.ts`**

```ts
import { eq } from 'drizzle-orm'
import { workspaces } from '~~/server/db/schema'
import type { RequestContext } from './context'

export async function getWorkspace(ctx: RequestContext) {
  const db = useDb()
  const [row] = await db.select().from(workspaces).where(eq(workspaces.id, ctx.workspaceId)).limit(1)
  return row ?? null
}

export async function renameWorkspace(ctx: RequestContext, name: string) {
  const db = useDb()
  await db.update(workspaces).set({ name }).where(eq(workspaces.id, ctx.workspaceId))
  return getWorkspace(ctx)
}
```

- [ ] **Step 4: Type-check + commit**

Run: `pnpm exec nuxi typecheck` (0 errors).
```bash
git add server/utils/context.ts server/utils/statuses.repo.ts server/utils/workspace.repo.ts
git commit -m "feat(settings): owner guard + status mutations + workspace repo"
```

---

## Task 3: Settings API endpoints (owner-only)

**Files:**
- Create: `server/api/statuses/index.post.ts`, `server/api/statuses/[id].patch.ts`, `server/api/statuses/[id].delete.ts`, `server/api/statuses/reorder.post.ts`, `server/api/workspace.get.ts`, `server/api/workspace.patch.ts`

- [ ] **Step 1: Status create**

`server/api/statuses/index.post.ts`:
```ts
import { statusCreateSchema } from '~~/shared/schemas/status'
import { createStatus } from '~~/server/utils/statuses.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const data = statusCreateSchema.parse(await readBody(event))
  return createStatus(ctx, data)
})
```

- [ ] **Step 2: Status update + delete**

`server/api/statuses/[id].patch.ts`:
```ts
import { statusUpdateSchema } from '~~/shared/schemas/status'
import { updateStatus } from '~~/server/utils/statuses.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  const patch = statusUpdateSchema.parse(await readBody(event))
  const row = await updateStatus(ctx, id, patch)
  if (!row) throw createError({ statusCode: 404, message: 'Status not found' })
  return row
})
```

`server/api/statuses/[id].delete.ts`:
```ts
import { deleteStatus } from '~~/server/utils/statuses.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  await deleteStatus(ctx, id)
  return { ok: true }
})
```

- [ ] **Step 3: Reorder + workspace**

`server/api/statuses/reorder.post.ts`:
```ts
import { reorderSchema } from '~~/shared/schemas/status'
import { reorderStatuses } from '~~/server/utils/statuses.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const { ids } = reorderSchema.parse(await readBody(event))
  await reorderStatuses(ctx, ids)
  return { ok: true }
})
```

`server/api/workspace.get.ts`:
```ts
import { getWorkspace } from '~~/server/utils/workspace.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  return getWorkspace(ctx)
})
```

`server/api/workspace.patch.ts`:
```ts
import { z } from 'zod'
import { renameWorkspace } from '~~/server/utils/workspace.repo'

const bodySchema = z.object({ name: z.string().trim().min(1).max(160) })

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const { name } = bodySchema.parse(await readBody(event))
  return renameWorkspace(ctx, name)
})
```
(`reorder.post.ts` is static, so it wins over `[id].patch/delete` for `/api/statuses/reorder`.)

- [ ] **Step 4: Type-check + commit**

Run: `pnpm exec nuxi typecheck` (0 errors).
```bash
git add server/api/statuses/index.post.ts server/api/statuses/[id].patch.ts server/api/statuses/[id].delete.ts server/api/statuses/reorder.post.ts server/api/workspace.get.ts server/api/workspace.patch.ts
git commit -m "feat(settings): owner-only status CRUD/reorder + workspace endpoints"
```

---

## Task 4: useSettings composable + Settings page + nav

**Files:**
- Create: `app/composables/useSettings.ts`, `app/pages/settings.vue`
- Modify: `app/layouts/default.vue`

> No unit tests; verify with typecheck + build. Follow `DESIGN.md`. The Settings nav link shows only for owners.

- [ ] **Step 1: Composable**

Create `app/composables/useSettings.ts`:
```ts
import type { StatusRow } from '~/composables/useStatuses'

export function useSettings() {
  const request = useRequestFetch()
  return {
    getWorkspace: () => request<{ id: number; name: string }>('/api/workspace'),
    renameWorkspace: (name: string) => request('/api/workspace', { method: 'PATCH', body: { name } }),
    listStatuses: () => request<StatusRow[]>('/api/statuses'),
    createStatus: (label: string, color: string) => request<StatusRow>('/api/statuses', { method: 'POST', body: { label, color } }),
    updateStatus: (id: number, patch: { label?: string; color?: string }) => request<StatusRow>(`/api/statuses/${id}`, { method: 'PATCH', body: patch }),
    deleteStatus: (id: number) => request(`/api/statuses/${id}`, { method: 'DELETE' }),
    reorderStatuses: (ids: number[]) => request('/api/statuses/reorder', { method: 'POST', body: { ids } }),
  }
}
```

- [ ] **Step 2: Settings page**

Create `app/pages/settings.vue`:
```vue
<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'

const PALETTE = ['#9e5733', '#b91c1c', '#a16207', '#15803d', '#2f9c63', '#1d4ed8', '#6b7280', '#7c3aed']

const settings = useSettings()
const { data: workspace, refresh: refreshWs } = await useAsyncData('ws', () => settings.getWorkspace())
const { data: statuses, refresh: refreshStatuses } = await useAsyncData('settings-statuses', () => settings.listStatuses())

const wsName = ref('')
watch(workspace, (w) => { wsName.value = w?.name ?? '' }, { immediate: true })

const newLabel = ref('')
const busy = ref(false)

async function saveName() {
  if (!wsName.value.trim()) return
  await settings.renameWorkspace(wsName.value.trim())
  await refreshWs()
}
async function addStatus() {
  if (!newLabel.value.trim() || busy.value) return
  busy.value = true
  try {
    await settings.createStatus(newLabel.value.trim(), PALETTE[0])
    newLabel.value = ''
    await refreshStatuses()
  } finally { busy.value = false }
}
async function rename(s: StatusRow, label: string) {
  if (!label.trim() || label === s.label) return
  await settings.updateStatus(s.id, { label: label.trim() })
  await refreshStatuses()
}
async function recolor(s: StatusRow, color: string) {
  await settings.updateStatus(s.id, { color })
  await refreshStatuses()
}
async function remove(s: StatusRow) {
  await settings.deleteStatus(s.id)
  await refreshStatuses()
}
async function move(index: number, dir: -1 | 1) {
  const list = [...(statuses.value ?? [])]
  const j = index + dir
  if (j < 0 || j >= list.length) return
  ;[list[index], list[j]] = [list[j]!, list[index]!]
  await settings.reorderStatuses(list.map((s) => s.id))
  await refreshStatuses()
}
</script>

<template>
  <div class="max-w-2xl space-y-8">
    <!-- Workspace -->
    <section>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">Workspace</h2>
      <div class="rounded-lg border border-line bg-surface p-4 shadow-card">
        <label class="mb-1 block text-xs font-medium text-muted">Name</label>
        <div class="flex gap-2">
          <input v-model="wsName" class="flex-1 rounded-md border border-line bg-card px-3 py-2 text-sm" @keyup.enter="saveName">
          <button class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px" @click="saveName">Save</button>
        </div>
      </div>
    </section>

    <!-- Statuses -->
    <section>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">Statuses</h2>
      <div class="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        <div v-for="(s, i) in (statuses ?? [])" :key="s.id" class="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
          <div class="flex flex-col">
            <button class="text-faint hover:text-ink disabled:opacity-30" :disabled="i === 0" @click="move(i, -1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="text-faint hover:text-ink disabled:opacity-30" :disabled="i === (statuses?.length ?? 0) - 1" @click="move(i, 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>

          <div class="flex items-center gap-1">
            <button
              v-for="c in PALETTE"
              :key="c"
              class="h-4 w-4 rounded-full ring-offset-1 transition"
              :class="s.color.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-ink/40' : ''"
              :style="{ backgroundColor: c }"
              :aria-label="`Set colour ${c}`"
              @click="recolor(s, c)"
            />
          </div>

          <input
            :value="s.label"
            class="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-ink hover:border-line focus:border-accent"
            @change="rename(s, ($event.target as HTMLInputElement).value)"
          >

          <button class="rounded-md p-1.5 text-faint hover:bg-red-50 hover:text-red-600" :aria-label="`Delete ${s.label}`" @click="remove(s)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>

        <div class="flex gap-2 px-4 py-3">
          <input v-model="newLabel" placeholder="New status name" class="flex-1 rounded-md border border-line bg-card px-3 py-2 text-sm" @keyup.enter="addStatus">
          <button class="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:border-line-strong disabled:opacity-60" :disabled="busy" @click="addStatus">Add status</button>
        </div>
      </div>
      <p class="mt-2 text-xs text-faint">Deleting a status leaves its leads without a status; it does not delete leads.</p>
    </section>
  </div>
</template>
```

- [ ] **Step 3: Owner-only nav link + title**

In `app/layouts/default.vue`:
(a) read the role from the session — add to `<script setup>`:
```ts
const { session } = useUserSession()
const isOwner = computed(() => (session.value as { role?: string } | null)?.role === 'owner')
```
(b) add `'/settings': 'Settings'` to the `titles` map.
(c) add this link inside `<nav>`, after the Import link (owner-only):
```vue
        <NuxtLink
          v-if="isOwner"
          to="/settings"
          class="flex items-center gap-2.5 rounded-md px-3 py-2 text-muted transition-colors hover:bg-canvas hover:text-ink"
          active-class="bg-accent-soft text-accent font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </NuxtLink>
```

- [ ] **Step 4: Type-check + build + commit**

Run: `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0 errors; tests pass; build completes).
```bash
git add app/composables/useSettings.ts app/pages/settings.vue app/layouts/default.vue
git commit -m "feat(settings): status manager + workspace rename page, owner-only nav"
```

---

## Task 5: Full verification + smoke

**Files:** none.

- [ ] **Step 1:** `pnpm test:run` — all specs pass (incl. `status.spec.ts`, 7).
- [ ] **Step 2:** `pnpm exec nuxi typecheck && pnpm build` — 0 errors; build completes.
- [ ] **Step 3: Manual smoke (dev + MySQL), logged in as the Owner:**
  1. Open **Settings** in the sidebar (it should be visible to the owner).
  2. Rename the workspace, Save, reload — the name persists.
  3. Add a status "Viewing" — it appears; pick a colour swatch for it.
  4. Rename an existing status inline (blur/enter) — persists.
  5. Move a status up/down — order persists after reload, and the new order shows in the Leads table's status dropdown.
  6. Delete a status that some leads use — those leads show no status on the Leads page (not deleted).

Expected: all steps behave as described. (If you can log in as an agent, confirm Settings is hidden and the endpoints return 403.)

- [ ] **Step 4: Commit (only if smoke fixes needed)** — `git add -A && git commit -m "test(settings): smoke fixes"`.

---

## Deferred (not in this plan)

- Optional-field toggles (email/intent/property-type/budget/tags) and wiring them through the add-lead form, table, and detail panel. Its own slice.
- Area-list management (autocomplete suggestions).
- Drag-and-drop status reordering (up/down buttons ship now).

## Done criteria

- `pnpm test:run` green (incl. `status.spec.ts`), typecheck 0, build succeeds.
- An Owner can rename the workspace and fully manage statuses (add/rename/recolor/reorder/delete) from Settings; changes reflect in the Leads status dropdown. Agents can't see Settings and the mutation endpoints reject them (403). All scoped to the workspace.
