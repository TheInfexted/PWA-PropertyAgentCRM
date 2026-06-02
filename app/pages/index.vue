<script setup lang="ts">
const { list, update, bulk } = useLeads()
const { statuses, load: loadStatuses } = useStatuses()
const { enabledFields, load: loadWsSettings } = useWorkspaceSettings()
const toast = useToast()
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
await loadWsSettings()
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
async function onStatusChange(id: number, newStatusId: number) {
  try { await update(id, { statusId: newStatusId }); await refresh() }
  catch { toast.error('Could not update status') }
}
async function onRemarksChange(id: number, remarks: string) {
  try { await update(id, { remarks }); toast.success('Remarks saved') }
  catch { toast.error('Could not save remarks') }
}
function onSortBy(col: 'name' | 'area' | 'createdAt') {
  if (sort.value === col) dir.value = dir.value === 'asc' ? 'desc' : 'asc'
  else { sort.value = col; dir.value = 'asc' }
}
async function onCreated() { showAdd.value = false; await refresh() }

// Bulk actions
const bulkStatusId = ref<number | null>(null)
const bulkAssignee = ref<number | null>(null)
function plural(n: number) { return n === 1 ? 'lead' : 'leads' }
async function applyBulkStatus() {
  if (!bulkStatusId.value || !selected.value.length) return
  const n = selected.value.length
  try {
    await bulk({ action: 'status', ids: selected.value, statusId: bulkStatusId.value })
    bulkStatusId.value = null; selected.value = []; await refresh()
    toast.success(`Updated ${n} ${plural(n)}`)
  } catch { toast.error('Could not update the selected leads') }
}
async function applyBulkAssign() {
  if (!bulkAssignee.value || !selected.value.length) return
  const n = selected.value.length
  try {
    await bulk({ action: 'assign', ids: selected.value, assignedTo: bulkAssignee.value })
    bulkAssignee.value = null; selected.value = []; await refresh()
    toast.success(`Assigned ${n} ${plural(n)}`)
  } catch { toast.error('Could not assign the selected leads') }
}
async function applyBulkDelete() {
  if (!selected.value.length) return
  const n = selected.value.length
  if (!confirm(`Delete ${n} ${plural(n)}? This cannot be undone.`)) return
  try {
    await bulk({ action: 'delete', ids: selected.value })
    selected.value = []; await refresh()
    toast.success(`Deleted ${n} ${plural(n)}`)
  } catch { toast.error('Delete failed') }
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
      :enabled-fields="enabledFields"
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
