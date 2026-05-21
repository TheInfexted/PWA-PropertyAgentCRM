<script setup lang="ts">
const props = defineProps<{ leadId: number }>()
const emit = defineEmits<{ close: [] }>()
const { data: lead } = useFetch(`/api/leads/${props.leadId}`, { lazy: true })
const { data: activities } = useFetch(`/api/leads/${props.leadId}/activities`, { lazy: true })
</script>

<template>
  <div class="fixed inset-y-0 right-0 z-10 w-96 overflow-y-auto border-l border-gray-200 bg-white p-5 shadow-xl">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-base font-semibold">{{ lead?.name || 'Lead' }}</h2>
      <button class="text-gray-400 hover:text-gray-700" @click="emit('close')">Close</button>
    </div>
    <dl class="space-y-1 text-sm">
      <div><dt class="text-gray-500">Phone</dt><dd class="font-mono">{{ lead?.phoneE164 || lead?.phoneRaw || '—' }}</dd></div>
      <div><dt class="text-gray-500">Area</dt><dd>{{ lead?.area || '—' }}</dd></div>
      <div><dt class="text-gray-500">Remarks</dt><dd>{{ lead?.remarks || '—' }}</dd></div>
    </dl>
    <h3 class="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Activity</h3>
    <ul class="space-y-1 text-xs text-gray-600">
      <li v-for="a in (activities ?? [])" :key="a.id">{{ a.type }} · {{ new Date(a.createdAt).toLocaleString() }}</li>
    </ul>
  </div>
</template>
