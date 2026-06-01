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
    <!-- Primary action lives in the header bar -->
    <ClientOnly>
      <Teleport to="#topbar-actions">
        <button
          class="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-card transition-colors hover:bg-accent-strong active:translate-y-px"
          @click="showAdd = true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add lead
        </button>
      </Teleport>
    </ClientOnly>

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
