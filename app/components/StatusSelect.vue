<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
defineProps<{ modelValue: number | null; statuses: StatusRow[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<template>
  <span class="relative inline-block">
    <select
      class="text-sm text-ink bg-transparent rounded-md border border-transparent px-2 py-1 pr-6 hover:border-line cursor-pointer appearance-none"
      :value="modelValue ?? ''"
      @change="emit('update:modelValue', Number(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
    </select>
    <!-- Chevron icon -->
    <span class="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-faint">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </span>
  </span>
</template>
