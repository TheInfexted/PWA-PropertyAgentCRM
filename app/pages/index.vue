<script setup lang="ts">
const { list, update } = useLeads()
const { statuses, load: loadStatuses } = useStatuses()

const search = ref('')
const statusId = ref<number | null>(null)
const openId = ref<number | null>(null)
const showAdd = ref(false)

await loadStatuses()
const { data, refresh } = await useAsyncData('leads', () =>
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
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold">Leads</h1>
      <button class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white" @click="showAdd = true">+ Add lead</button>
    </div>

    <FiltersBar v-model:search="search" v-model:status-id="statusId" :statuses="statuses" />

    <LeadsTable
      :rows="(data?.rows ?? []) as any"
      :statuses="statuses"
      @open="openId = $event"
      @status-change="onStatusChange"
    />

    <LeadDetailPanel v-if="openId" :lead-id="openId" @close="openId = null" />
    <AddLeadModal v-if="showAdd" :statuses="statuses" @created="onCreated" @close="showAdd = false" />
  </div>
</template>
