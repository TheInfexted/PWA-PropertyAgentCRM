<script setup lang="ts">
const { list, update } = useLeads()
const { statuses, load: loadStatuses } = useStatuses()

const search = ref('')
const statusId = ref<number | null>(null)
const openId = ref<number | null>(null)
const showAdd = ref(false)

await loadStatuses()
const { data, refresh, pending } = await useAsyncData('leads', () =>
  list({ page: 1, pageSize: 50, search: search.value || undefined, statusId: statusId.value || undefined }),
  { watch: [search, statusId] },
)

async function onStatusChange(id: number, newStatusId: number) {
  await update(id, { statusId: newStatusId })
  await refresh()
}
async function onCreated() {
  showAdd.value = false
  await refresh()
}
</script>

<template>
  <div>
    <!-- Header row -->
    <div class="flex items-end justify-between mb-5">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Leads</h1>
        <p class="text-sm text-muted mt-0.5">{{ data?.total ?? 0 }} leads</p>
      </div>
      <button
        class="inline-flex items-center gap-1.5 bg-accent text-white rounded-md px-4 py-2 text-sm font-semibold hover:bg-accent-strong active:translate-y-px shadow-card"
        @click="showAdd = true"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add lead
      </button>
    </div>

    <FiltersBar v-model:search="search" v-model:status-id="statusId" :statuses="statuses" />

    <LeadsTable
      :rows="(data?.rows ?? []) as any"
      :statuses="statuses"
      :loading="pending"
      @open="openId = $event"
      @status-change="onStatusChange"
    />

    <LeadDetailPanel v-if="openId" :lead-id="openId" @close="openId = null" />
    <AddLeadModal v-if="showAdd" :statuses="statuses" @created="onCreated" @close="showAdd = false" />
  </div>
</template>
