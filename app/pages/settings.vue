<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
import { OPTIONAL_FIELD_KEYS, OPTIONAL_FIELD_LABELS, type OptionalFieldKey, type WorkspaceSettings } from '~~/shared/types'

const PALETTE = ['#9e5733', '#b91c1c', '#a16207', '#15803d', '#2f9c63', '#1d4ed8', '#6b7280', '#7c3aed']

const settings = useSettings()
const { data: workspace, refresh: refreshWs } = await useAsyncData('ws', () => settings.getWorkspace())
const { data: statuses, refresh: refreshStatuses } = await useAsyncData('settings-statuses', () => settings.listStatuses())

const wsName = ref('')
watch(workspace, (w) => { wsName.value = w?.name ?? '' }, { immediate: true })

const newLabel = ref('')
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
    await settings.createStatus(newLabel.value.trim(), PALETTE[0]!)
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
              class="h-4 w-4 rounded-full transition"
              :class="s.color.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-ink/40 ring-offset-1' : ''"
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
  </div>
</template>
