<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
defineProps<{ modelValue: number | null; statuses: StatusRow[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<template>
  <select
    class="rounded-md border border-gray-300 px-2 py-1 text-sm"
    :value="modelValue ?? ''"
    @change="emit('update:modelValue', Number(($event.target as HTMLSelectElement).value))"
  >
    <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
  </select>
</template>
