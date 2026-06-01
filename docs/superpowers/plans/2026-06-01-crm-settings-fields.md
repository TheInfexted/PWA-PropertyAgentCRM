# Settings Completion — Optional Fields + Area Management Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish Settings (spec §4.3 screen 5) and the optional-field system (§4.1): let an Owner toggle optional lead fields (Email, Intent, Property type, Budget, Tags) and manage the workspace area list; surface enabled optional fields in the Add-lead form, the lead detail panel, and as conditional table columns; add area autocomplete on the form.

**Architecture:** The DB already has every optional column on `leads`, `createLead`/`updateLead` already persist them, and `WorkspaceSettings { enabledOptionalFields, areas }` already exists on the `workspaces.settings` JSON column (seeded with defaults at setup). This plan adds: a workspace-settings PATCH path, Settings UI, a shared `useWorkspaceSettings` composable (cached via `useState`, same pattern as `useStatuses`), and conditional rendering keyed off `enabledOptionalFields`.

**Tech Stack:** Nuxt 4 (Vue 3 + TS), Tailwind v4, Drizzle + MySQL, Vitest. Reuses `requireOwner`, `useSettings`, `useLeads`, `DESIGN.md`.

**Plan:** Plan 7 of the Phase-1 sequence (second of three "finish Phase 1" plans). Spec: `docs/superpowers/specs/2026-05-21-property-crm-core-design.md` (§4.1, §4.3 screen 5).

**Conventions (all tasks):**
- Run from project root. Branch: `feat/settings-fields`.
- Tests `*.spec.ts` next to code. Single: `pnpm vitest run <path>`. All: `pnpm test:run`. Keep `pnpm exec nuxi typecheck` at 0.
- Commit per task; `git add` only named files (no `-A`). Aliases `~~/` root, `~/` app. Follow `DESIGN.md` (terracotta accent, warm neutrals, WCAG AA).

---

## Task 1: Workspace settings schema (TDD) + types + repo + endpoint

**Files:**
- Modify: `shared/types.ts`
- Create: `shared/schemas/workspace.ts`, `shared/schemas/workspace.spec.ts`
- Modify: `server/utils/workspace.repo.ts`, `server/api/workspace.patch.ts`

- [ ] **Step 1: Update `shared/types.ts`** — make the optional-field keys a single source of truth and add labels.

Replace the line `export type OptionalFieldKey = | 'email' | 'intent' | 'propertyType' | 'budget' | 'tags'` (it currently spans two lines, lines 10–11) with:
```ts
export const OPTIONAL_FIELD_KEYS = ['email', 'intent', 'propertyType', 'budget', 'tags'] as const
export type OptionalFieldKey = (typeof OPTIONAL_FIELD_KEYS)[number]

export const OPTIONAL_FIELD_LABELS: Record<OptionalFieldKey, string> = {
  email: 'Email',
  intent: 'Intent',
  propertyType: 'Property type',
  budget: 'Budget',
  tags: 'Tags',
}
```
Leave `WorkspaceSettings`, `DEFAULT_WORKSPACE_SETTINGS`, and the other types unchanged.

- [ ] **Step 2: Write failing schema tests** — create `shared/schemas/workspace.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { workspaceSettingsSchema, workspacePatchSchema } from './workspace'

describe('workspaceSettingsSchema', () => {
  it('accepts known optional-field keys and areas', () => {
    expect(workspaceSettingsSchema.safeParse({ enabledOptionalFields: ['email', 'budget'], areas: ['PJ', 'KL'] }).success).toBe(true)
  })
  it('rejects an unknown optional-field key', () => {
    expect(workspaceSettingsSchema.safeParse({ enabledOptionalFields: ['nope'], areas: [] }).success).toBe(false)
  })
  it('rejects a blank area', () => {
    expect(workspaceSettingsSchema.safeParse({ enabledOptionalFields: [], areas: [''] }).success).toBe(false)
  })
})

describe('workspacePatchSchema', () => {
  it('accepts a name-only patch', () => {
    expect(workspacePatchSchema.safeParse({ name: 'Kirana' }).success).toBe(true)
  })
  it('accepts a settings-only patch', () => {
    expect(workspacePatchSchema.safeParse({ settings: { enabledOptionalFields: [], areas: [] } }).success).toBe(true)
  })
  it('rejects an empty patch', () => {
    expect(workspacePatchSchema.safeParse({}).success).toBe(false)
  })
})
```

- [ ] **Step 3: Run — expect FAIL** (`./workspace` unresolved).

Run: `pnpm vitest run shared/schemas/workspace.spec.ts`

- [ ] **Step 4: Implement `shared/schemas/workspace.ts`:**
```ts
import { z } from 'zod'
import { OPTIONAL_FIELD_KEYS } from '~~/shared/types'

export const workspaceSettingsSchema = z.object({
  enabledOptionalFields: z.array(z.enum(OPTIONAL_FIELD_KEYS)).max(5),
  areas: z.array(z.string().trim().min(1).max(120)).max(200),
})

export const workspacePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    settings: workspaceSettingsSchema.optional(),
  })
  .refine((d) => d.name !== undefined || d.settings !== undefined, { message: 'Nothing to update' })

export type WorkspacePatch = z.infer<typeof workspacePatchSchema>
```
(zod v3 `z.enum` accepts the `as const` readonly tuple, so `enabledOptionalFields` infers as `OptionalFieldKey[]`.)

- [ ] **Step 5: Run — expect PASS** (6 tests).

Run: `pnpm vitest run shared/schemas/workspace.spec.ts`

- [ ] **Step 6: Add `updateWorkspace` to `server/utils/workspace.repo.ts`** — append (keep `getWorkspace` and `renameWorkspace` as-is; add the `WorkspaceSettings` type import at the top):

At the top, after the existing imports, add:
```ts
import type { WorkspaceSettings } from '~~/shared/types'
```
At the end of the file, add:
```ts
export async function updateWorkspace(ctx: RequestContext, patch: { name?: string; settings?: WorkspaceSettings }) {
  const db = useDb()
  const set: Partial<typeof workspaces.$inferInsert> = {}
  if (patch.name !== undefined) set.name = patch.name
  if (patch.settings !== undefined) set.settings = patch.settings
  if (Object.keys(set).length) {
    await db.update(workspaces).set(set).where(eq(workspaces.id, ctx.workspaceId))
  }
  return getWorkspace(ctx)
}
```

- [ ] **Step 7: Replace `server/api/workspace.patch.ts`** with:
```ts
import { workspacePatchSchema } from '~~/shared/schemas/workspace'
import { updateWorkspace } from '~~/server/utils/workspace.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const patch = workspacePatchSchema.parse(await readBody(event))
  return updateWorkspace(ctx, patch)
})
```

- [ ] **Step 8: Typecheck + full tests + commit**

Run: `pnpm exec nuxi typecheck && pnpm test:run` (0 errors; all specs pass incl. the 6 new).
```bash
git add shared/types.ts shared/schemas/workspace.ts shared/schemas/workspace.spec.ts server/utils/workspace.repo.ts server/api/workspace.patch.ts
git commit -m "feat(settings): workspace settings patch schema + repo update path"
```

---

## Task 2: useSettings.updateSettings + Settings page sections

**Files:**
- Modify: `app/composables/useSettings.ts`, `app/pages/settings.vue`

- [ ] **Step 1: Extend `app/composables/useSettings.ts`** — full file becomes:
```ts
import type { StatusRow } from '~/composables/useStatuses'
import type { WorkspaceSettings } from '~~/shared/types'

export function useSettings() {
  const request = useRequestFetch()
  return {
    getWorkspace: () => request<{ id: number; name: string; settings: WorkspaceSettings }>('/api/workspace'),
    renameWorkspace: (name: string) => request('/api/workspace', { method: 'PATCH', body: { name } }),
    updateSettings: (settings: WorkspaceSettings) => request('/api/workspace', { method: 'PATCH', body: { settings } }),
    listStatuses: () => request<StatusRow[]>('/api/statuses'),
    createStatus: (label: string, color: string) => request<StatusRow>('/api/statuses', { method: 'POST', body: { label, color } }),
    updateStatus: (id: number, patch: { label?: string; color?: string }) => request<StatusRow>(`/api/statuses/${id}`, { method: 'PATCH', body: patch }),
    deleteStatus: (id: number) => request(`/api/statuses/${id}`, { method: 'DELETE' }),
    reorderStatuses: (ids: number[]) => request('/api/statuses/reorder', { method: 'POST', body: { ids } }),
  }
}
```

- [ ] **Step 2: Add optional-field + area state to `app/pages/settings.vue` `<script setup>`**

Add this import at the top of the script (after the existing `import type { StatusRow }` line):
```ts
import { OPTIONAL_FIELD_KEYS, OPTIONAL_FIELD_LABELS, type OptionalFieldKey, type WorkspaceSettings } from '~~/shared/types'
```
Then, immediately after the existing `const newLabel = ref('')` line, add:
```ts
const enabled = ref<OptionalFieldKey[]>([])
const areas = ref<string[]>([])
const newArea = ref('')

watch(workspace, (w) => {
  const s = (w as { settings?: WorkspaceSettings } | null)?.settings
  enabled.value = [...(s?.enabledOptionalFields ?? [])]
  areas.value = [...(s?.areas ?? [])]
}, { immediate: true })

async function persistSettings() {
  await settings.updateSettings({ enabledOptionalFields: enabled.value, areas: areas.value })
  await refreshWs()
}
async function toggleField(key: OptionalFieldKey) {
  enabled.value = enabled.value.includes(key) ? enabled.value.filter((k) => k !== key) : [...enabled.value, key]
  await persistSettings()
}
async function addArea() {
  const a = newArea.value.trim()
  if (!a || areas.value.includes(a)) { newArea.value = ''; return }
  areas.value = [...areas.value, a]
  newArea.value = ''
  await persistSettings()
}
async function removeArea(a: string) {
  areas.value = areas.value.filter((x) => x !== a)
  await persistSettings()
}
```

- [ ] **Step 3: Add the two sections to the template** — insert immediately AFTER the closing `</section>` of the Statuses section (the one ending with the `<p class="mt-2 text-xs text-faint">Deleting a status…</p>` line) and BEFORE the final `</div>`:
```vue
    <section>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">Optional lead fields</h2>
      <div class="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        <label
          v-for="key in OPTIONAL_FIELD_KEYS"
          :key="key"
          class="flex cursor-pointer items-center justify-between border-b border-line px-4 py-3 last:border-b-0 hover:bg-canvas/40"
        >
          <span class="text-sm text-ink">{{ OPTIONAL_FIELD_LABELS[key] }}</span>
          <input type="checkbox" class="accent-accent" :checked="enabled.includes(key)" @change="toggleField(key)">
        </label>
      </div>
      <p class="mt-2 text-xs text-faint">Enabled fields appear on the add-lead form, the lead detail panel, and as table columns.</p>
    </section>

    <section>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">Areas</h2>
      <div class="rounded-lg border border-line bg-surface p-4 shadow-card">
        <div v-if="areas.length" class="mb-3 flex flex-wrap gap-2">
          <span v-for="a in areas" :key="a" class="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas/60 px-2.5 py-1 text-sm text-ink">
            {{ a }}
            <button class="text-faint hover:text-red-600" :aria-label="`Remove ${a}`" @click="removeArea(a)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </span>
        </div>
        <div class="flex gap-2">
          <input v-model="newArea" placeholder="Add an area (e.g. Petaling Jaya)" class="flex-1 rounded-md border border-line bg-card px-3 py-2 text-sm" @keyup.enter="addArea">
          <button class="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:border-line-strong" @click="addArea">Add area</button>
        </div>
      </div>
      <p class="mt-2 text-xs text-faint">Areas power autocomplete on the add-lead form.</p>
    </section>
```

- [ ] **Step 4: Typecheck + build + commit**

Run: `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; tests pass; build completes).
```bash
git add app/composables/useSettings.ts app/pages/settings.vue
git commit -m "feat(settings): optional-field toggles + area-list management UI"
```

---

## Task 3: useWorkspaceSettings composable + optionalFields util (TDD) + Add-lead form

**Files:**
- Create: `app/composables/useWorkspaceSettings.ts`, `app/utils/optionalFields.ts`, `app/utils/optionalFields.spec.ts`
- Modify: `app/components/AddLeadModal.vue`

- [ ] **Step 1: Create the cached settings composable `app/composables/useWorkspaceSettings.ts`:**
```ts
import type { WorkspaceSettings, OptionalFieldKey } from '~~/shared/types'

export function useWorkspaceSettings() {
  const request = useRequestFetch()
  const settings = useState<WorkspaceSettings>('ws-settings', () => ({ enabledOptionalFields: [], areas: [] }))
  const loaded = useState<boolean>('ws-settings-loaded', () => false)

  async function load(force = false) {
    if (loaded.value && !force) return settings.value
    const ws = await request<{ settings: WorkspaceSettings }>('/api/workspace')
    if (ws?.settings) settings.value = ws.settings
    loaded.value = true
    return settings.value
  }
  const enabledFields = computed<OptionalFieldKey[]>(() => settings.value.enabledOptionalFields ?? [])
  const areas = computed<string[]>(() => settings.value.areas ?? [])
  function isEnabled(key: OptionalFieldKey) { return enabledFields.value.includes(key) }

  return { settings, load, enabledFields, areas, isEnabled }
}
```

- [ ] **Step 2: Write failing util tests** — create `app/utils/optionalFields.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { formatBudget, optionalFieldDisplay } from './optionalFields'

describe('formatBudget', () => {
  it('is empty when both bounds are null', () => {
    expect(formatBudget(null, null)).toBe('')
  })
  it('formats a min–max range with thousands separators', () => {
    expect(formatBudget(300000, 500000)).toBe('300,000–500,000')
  })
  it('formats an open-ended min or max', () => {
    expect(formatBudget(300000, null)).toBe('≥ 300,000')
    expect(formatBudget(null, 500000)).toBe('≤ 500,000')
  })
})

describe('optionalFieldDisplay', () => {
  it('reads simple fields', () => {
    expect(optionalFieldDisplay({ email: 'a@b.my' }, 'email')).toBe('a@b.my')
    expect(optionalFieldDisplay({ propertyType: 'Condo' }, 'propertyType')).toBe('Condo')
    expect(optionalFieldDisplay({ intent: 'buy' }, 'intent')).toBe('buy')
  })
  it('joins tags and formats budget', () => {
    expect(optionalFieldDisplay({ tags: ['hot', 'vip'] }, 'tags')).toBe('hot, vip')
    expect(optionalFieldDisplay({ budgetMin: 100000, budgetMax: 200000 }, 'budget')).toBe('100,000–200,000')
  })
  it('returns empty string for missing values', () => {
    expect(optionalFieldDisplay({}, 'email')).toBe('')
    expect(optionalFieldDisplay({}, 'tags')).toBe('')
  })
})
```

- [ ] **Step 3: Run — expect FAIL** (`./optionalFields` unresolved).

Run: `pnpm vitest run app/utils/optionalFields.spec.ts`

- [ ] **Step 4: Implement `app/utils/optionalFields.ts`:**
```ts
import type { OptionalFieldKey } from '~~/shared/types'

export interface OptionalFieldSource {
  email?: string | null
  intent?: string | null
  propertyType?: string | null
  budgetMin?: number | null
  budgetMax?: number | null
  tags?: string[] | null
}

export function formatBudget(min?: number | null, max?: number | null): string {
  const f = (n: number) => n.toLocaleString('en-US')
  if (min == null && max == null) return ''
  if (min != null && max != null) return `${f(min)}–${f(max)}`
  if (min != null) return `≥ ${f(min)}`
  return `≤ ${f(max as number)}`
}

export function optionalFieldDisplay(row: OptionalFieldSource, key: OptionalFieldKey): string {
  switch (key) {
    case 'email': return row.email ?? ''
    case 'intent': return row.intent ?? ''
    case 'propertyType': return row.propertyType ?? ''
    case 'budget': return formatBudget(row.budgetMin, row.budgetMax)
    case 'tags': return (row.tags ?? []).join(', ')
  }
}
```

- [ ] **Step 5: Run — expect PASS.**

Run: `pnpm vitest run app/utils/optionalFields.spec.ts`

- [ ] **Step 6: Rebuild `app/components/AddLeadModal.vue`** — full file becomes:
```vue
<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
const props = defineProps<{ statuses: StatusRow[] }>()
const emit = defineEmits<{ created: []; close: [] }>()
const { create } = useLeads()

const ws = useWorkspaceSettings()
const { areas, isEnabled } = ws
onMounted(() => { ws.load() })

const form = reactive({
  name: '', phone: '', area: '', statusId: props.statuses[0]?.id ?? null, remarks: '',
  email: '', intent: '' as '' | 'buy' | 'rent' | 'sell' | 'invest',
  propertyType: '', budgetMin: null as number | null, budgetMax: null as number | null, tagsText: '',
})
const error = ref('')

async function submit() {
  error.value = ''
  const body: Record<string, unknown> = {
    name: form.name, phone: form.phone, area: form.area, statusId: form.statusId, remarks: form.remarks,
  }
  if (isEnabled('email') && form.email.trim()) body.email = form.email.trim()
  if (isEnabled('intent') && form.intent) body.intent = form.intent
  if (isEnabled('propertyType') && form.propertyType.trim()) body.propertyType = form.propertyType.trim()
  if (isEnabled('budget')) {
    if (form.budgetMin != null) body.budgetMin = form.budgetMin
    if (form.budgetMax != null) body.budgetMax = form.budgetMax
  }
  if (isEnabled('tags') && form.tagsText.trim()) {
    body.tags = form.tagsText.split(',').map((t) => t.trim()).filter(Boolean)
  }
  try {
    await create(body as Parameters<typeof create>[0])
    emit('created')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Could not save the lead'
  }
}
const inp = 'w-full rounded-md border border-line px-3 py-2 text-sm'
</script>

<template>
  <div class="fixed inset-0 z-30 grid place-items-center bg-ink/30 backdrop-blur-sm" @click.self="emit('close')">
    <div class="relative z-10 max-h-[90vh] w-[26rem] overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-pop">
      <h2 class="mb-4 text-base font-semibold tracking-tight">New lead</h2>

      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Name</label>
          <input v-model="form.name" placeholder="Full name" :class="inp">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Phone</label>
          <input v-model="form.phone" placeholder="+60 12 345 6789" :class="`${inp} font-mono`">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Area</label>
          <input v-model="form.area" list="area-suggestions" placeholder="e.g. Petaling Jaya" :class="inp">
          <datalist id="area-suggestions">
            <option v-for="a in areas" :key="a" :value="a" />
          </datalist>
        </div>

        <div v-if="isEnabled('email')">
          <label class="mb-1 block text-xs font-medium text-muted">Email</label>
          <input v-model="form.email" type="email" placeholder="name@email.com" :class="inp">
        </div>
        <div v-if="isEnabled('intent')">
          <label class="mb-1 block text-xs font-medium text-muted">Intent</label>
          <select v-model="form.intent" :class="inp">
            <option value="">—</option>
            <option value="buy">Buy</option>
            <option value="rent">Rent</option>
            <option value="sell">Sell</option>
            <option value="invest">Invest</option>
          </select>
        </div>
        <div v-if="isEnabled('propertyType')">
          <label class="mb-1 block text-xs font-medium text-muted">Property type</label>
          <input v-model="form.propertyType" placeholder="e.g. Condo, Terrace" :class="inp">
        </div>
        <div v-if="isEnabled('budget')" class="flex gap-2">
          <div class="flex-1">
            <label class="mb-1 block text-xs font-medium text-muted">Budget min</label>
            <input v-model.number="form.budgetMin" type="number" min="0" placeholder="0" :class="`${inp} font-mono`">
          </div>
          <div class="flex-1">
            <label class="mb-1 block text-xs font-medium text-muted">Budget max</label>
            <input v-model.number="form.budgetMax" type="number" min="0" placeholder="0" :class="`${inp} font-mono`">
          </div>
        </div>
        <div v-if="isEnabled('tags')">
          <label class="mb-1 block text-xs font-medium text-muted">Tags</label>
          <input v-model="form.tagsText" placeholder="Comma separated, e.g. hot, referral" :class="inp">
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Status</label>
          <select v-model.number="form.statusId" :class="inp">
            <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Remarks</label>
          <textarea v-model="form.remarks" placeholder="Notes about this lead…" :class="`${inp} h-20 resize-none`" />
        </div>
      </div>

      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>

      <div class="mt-5 flex justify-end gap-2">
        <button class="px-3 py-2 text-sm text-muted hover:text-ink" @click="emit('close')">Cancel</button>
        <button class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px" @click="submit">Save</button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 7: Typecheck + tests + build + commit**

Run: `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; tests pass incl. the new util specs; build completes).
```bash
git add app/composables/useWorkspaceSettings.ts app/utils/optionalFields.ts app/utils/optionalFields.spec.ts app/components/AddLeadModal.vue
git commit -m "feat(leads): workspace-settings composable, optional-field add-lead inputs + area autocomplete"
```

---

## Task 4: Conditional optional columns + detail-panel display + page wiring

**Files:**
- Modify: `app/components/LeadsTable.vue`, `app/components/LeadDetailPanel.vue`, `app/pages/index.vue`

- [ ] **Step 1: Rebuild `app/components/LeadsTable.vue`** with optional columns. Full file becomes:
```vue
<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
import { OPTIONAL_FIELD_LABELS, type OptionalFieldKey } from '~~/shared/types'
import { optionalFieldDisplay } from '~/utils/optionalFields'

interface LeadRow {
  id: number; name: string; phoneE164: string | null; phoneRaw: string | null
  area: string; statusId: number | null; remarks: string | null
  email?: string | null; intent?: string | null; propertyType?: string | null
  budgetMin?: number | null; budgetMax?: number | null; tags?: string[] | null
}
const props = defineProps<{
  rows: LeadRow[]; statuses: StatusRow[]; loading?: boolean
  sort?: string; dir?: string; enabledFields?: OptionalFieldKey[]
}>()
const emit = defineEmits<{
  open: [id: number]
  statusChange: [id: number, statusId: number]
  remarksChange: [id: number, remarks: string]
  logged: []
  sortBy: [col: 'name' | 'area' | 'createdAt']
}>()

const selected = defineModel<number[]>('selected', { default: () => [] })
const fields = computed(() => props.enabledFields ?? [])
const colspan = computed(() => 7 + fields.value.length)

const allChecked = computed(() => props.rows.length > 0 && props.rows.every((r) => selected.value.includes(r.id)))
const someChecked = computed(() => props.rows.some((r) => selected.value.includes(r.id)) && !allChecked.value)
function toggleAll() { selected.value = allChecked.value ? [] : props.rows.map((r) => r.id) }
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
          <th v-for="key in fields" :key="key" :class="th">{{ OPTIONAL_FIELD_LABELS[key] }}</th>
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
            <td v-for="key in fields" :key="key" class="px-4 py-3.5"><div class="h-3.5 w-16 rounded bg-line animate-pulse" /></td>
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
            <td v-for="key in fields" :key="key" class="px-4 py-3.5 text-muted">{{ optionalFieldDisplay(row, key) || '—' }}</td>
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
            <td :colspan="colspan" class="py-16 text-center">
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

- [ ] **Step 2: Add optional-field display to `app/components/LeadDetailPanel.vue`**

In `<script setup>`, add these imports at the top (after the existing `import { isoToDateInput, dateInputToIso }` line):
```ts
import { OPTIONAL_FIELD_LABELS, type OptionalFieldKey } from '~~/shared/types'
import { optionalFieldDisplay, type OptionalFieldSource } from '~/utils/optionalFields'
```
Then, immediately after the `const { data: members } = useFetch(...)` line, add:
```ts
const ws = useWorkspaceSettings()
const { enabledFields } = ws
onMounted(() => { ws.load() })
function optDisplay(key: OptionalFieldKey) {
  return optionalFieldDisplay((lead.value ?? {}) as OptionalFieldSource, key)
}
```
In the template, inside the `<dl class="space-y-2.5 text-sm">` block, AFTER the existing Remarks `<div>` and before `</dl>`, add:
```vue
      <div v-for="key in enabledFields" :key="key">
        <dt class="text-xs uppercase tracking-wide text-faint">{{ OPTIONAL_FIELD_LABELS[key] }}</dt>
        <dd class="text-ink">{{ optDisplay(key) || '—' }}</dd>
      </div>
```

- [ ] **Step 3: Wire settings into `app/pages/index.vue`**

In `<script setup>`, after the existing `const { statuses, load: loadStatuses } = useStatuses()` line, add:
```ts
const { enabledFields, load: loadWsSettings } = useWorkspaceSettings()
```
Then, immediately after the existing `await loadStatuses()` line, add:
```ts
await loadWsSettings()
```
Finally, in the `<LeadsTable …>` tag, add the prop `:enabled-fields="enabledFields"` (alongside the existing `:statuses`, `:loading`, `:sort`, `:dir` props).

- [ ] **Step 4: Typecheck + tests + build + commit**

Run: `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; tests pass; build completes).
```bash
git add app/components/LeadsTable.vue app/components/LeadDetailPanel.vue app/pages/index.vue
git commit -m "feat(leads): conditional optional columns, detail-panel optional display, settings wiring"
```

---

## Task 5: Full verification + smoke

**Files:** none.

- [ ] **Step 1:** `pnpm test:run` — all specs pass (incl. `workspace.spec.ts` (6) and `optionalFields.spec.ts`).
- [ ] **Step 2:** `pnpm exec nuxi typecheck && pnpm build` — 0 errors; build completes.
- [ ] **Step 3: Manual smoke (dev + MySQL, as Owner):**
  1. Settings → **Optional lead fields**: enable Email + Budget + Tags. Add areas "Petaling Jaya", "Mont Kiara".
  2. Leads → **Add lead**: the form now shows Email, Budget min/max, Tags inputs; the Area input autocompletes the two areas. Save a lead with those values.
  3. The Leads table now shows **Email / Budget / Tags** columns with that lead's values; budget renders like `300,000–500,000`.
  4. Open the lead → the detail panel lists the enabled optional fields with their values.
  5. Settings → disable Tags → the Tags column and the form input disappear; the data is retained (re-enabling shows it again).
  6. As an **agent**, Settings/Team nav stay hidden; the optional columns still render for them (read scope unaffected).

- [ ] **Step 4: Merge to master**
```bash
git checkout master && git merge --ff-only feat/settings-fields && git branch -d feat/settings-fields
```

---

## Deferred (not in this plan)
- Editing optional fields on an existing lead from the detail panel (display-only here, mirroring the panel's existing read-only core fields; status/remarks remain inline-editable in the table, follow-up/assignee in the panel).

## Done criteria
- `pnpm test:run` green, typecheck 0, build succeeds.
- Owner can toggle optional fields + manage areas in Settings; enabled fields appear on the add-lead form (with area autocomplete), as table columns, and in the detail panel — fulfilling §4.1 and §4.3 screen 5.
