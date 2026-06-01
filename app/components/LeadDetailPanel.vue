<script setup lang="ts">
const props = defineProps<{ leadId: number }>()
const emit = defineEmits<{ close: [] }>()
const { data: lead } = useFetch(`/api/leads/${props.leadId}`, { lazy: true })
const { data: activities } = useFetch(`/api/leads/${props.leadId}/activities`, { lazy: true })
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 z-20 bg-ink/20" @click="emit('close')" />

  <!-- Panel -->
  <div class="fixed inset-y-0 right-0 z-30 w-[26rem] bg-surface border-l border-line shadow-pop p-6 overflow-y-auto">
    <!-- Header -->
    <div class="mb-5 flex items-center justify-between">
      <h2 class="text-lg font-semibold tracking-tight">{{ lead?.name || 'Lead' }}</h2>
      <button class="text-faint hover:text-ink p-1 rounded-md" @click="emit('close')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Details -->
    <dl class="space-y-3">
      <div>
        <dt class="text-xs uppercase tracking-wide text-faint mb-0.5">Phone</dt>
        <dd class="text-sm text-ink font-mono">{{ lead?.phoneE164 || lead?.phoneRaw || '—' }}</dd>
      </div>
      <div>
        <dt class="text-xs uppercase tracking-wide text-faint mb-0.5">Area</dt>
        <dd class="text-sm text-ink">{{ lead?.area || '—' }}</dd>
      </div>
      <div>
        <dt class="text-xs uppercase tracking-wide text-faint mb-0.5">Remarks</dt>
        <dd class="text-sm text-ink">{{ lead?.remarks || '—' }}</dd>
      </div>
    </dl>

    <!-- Activity timeline -->
    <div class="mt-6">
      <h3 class="text-xs uppercase tracking-wide text-faint mb-3">Activity</h3>
      <ul class="space-y-3">
        <li
          v-for="a in (activities ?? [])"
          :key="a.id"
          class="flex items-start gap-3"
        >
          <!-- Timeline dot -->
          <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-soft border border-accent/40 shrink-0" />
          <div>
            <span class="text-sm text-ink">{{ a.type }}</span>
            <span class="block text-xs text-faint">{{ new Date(a.createdAt).toLocaleString() }}</span>
          </div>
        </li>
        <li v-if="!(activities ?? []).length" class="text-sm text-faint">No activity yet.</li>
      </ul>
    </div>
  </div>
</template>
