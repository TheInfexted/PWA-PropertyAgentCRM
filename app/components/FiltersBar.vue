<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
defineProps<{ statuses: StatusRow[] }>()
const search = defineModel<string>('search', { default: '' })
const statusId = defineModel<number | null>('statusId', { default: null })
</script>

<template>
  <div class="mb-4 flex items-center gap-3">
    <input
      v-model="search"
      type="search"
      placeholder="Search name or phone…"
      class="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
    >
    <select
      class="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      :value="statusId ?? ''"
      @change="statusId = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null"
    >
      <option value="">All statuses</option>
      <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
    </select>
  </div>
</template>
