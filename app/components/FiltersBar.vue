<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
defineProps<{ statuses: StatusRow[] }>()
const search = defineModel<string>('search', { default: '' })
const statusId = defineModel<number | null>('statusId', { default: null })
</script>

<template>
  <div class="flex items-center gap-3 mb-5">
    <!-- Search input with icon -->
    <div class="relative">
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <input
        v-model="search"
        type="search"
        placeholder="Search name or phone…"
        class="pl-9 pr-3 py-2 w-72 rounded-md border border-line bg-surface text-sm"
      >
    </div>

    <!-- Status filter -->
    <select
      class="rounded-md border border-line bg-surface px-3 py-2 text-sm"
      :value="statusId ?? ''"
      @change="statusId = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null"
    >
      <option value="">All statuses</option>
      <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
    </select>
  </div>
</template>
