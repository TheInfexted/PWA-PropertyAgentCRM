<script setup lang="ts">
import { followUpState, storedToDateInput } from '~~/shared/utils/followup'
import type { DueLead } from '~/composables/useFollowUps'

defineProps<{ rows: DueLead[] }>()
const emit = defineEmits<{ done: [id: number]; reschedule: [id: number, date: string] }>()

function stateBadge(date: string | null): { label: string; cls: string } {
  const s = followUpState(date)
  if (s === 'overdue') return { label: 'Overdue', cls: 'bg-red-50 text-red-700 border-red-200' }
  return { label: 'Today', cls: 'bg-accent-soft text-accent border-line' }
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
    <table class="w-full text-sm">
      <thead class="bg-canvas/60">
        <tr>
          <th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Name</th>
          <th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Phone</th>
          <th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Area</th>
          <th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Due</th>
          <th class="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" class="border-t border-line hover:bg-accent-soft/40">
          <td class="px-5 py-3.5 font-medium text-ink">{{ row.name || '—' }}</td>
          <td class="px-5 py-3.5 font-mono text-[13px] text-muted">{{ row.phoneE164 || row.phoneRaw || '—' }}</td>
          <td class="px-5 py-3.5 text-muted">{{ row.area || '—' }}</td>
          <td class="px-5 py-3.5">
            <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium" :class="stateBadge(row.nextFollowUpAt).cls">
              {{ stateBadge(row.nextFollowUpAt).label }}
            </span>
          </td>
          <td class="px-5 py-3.5">
            <div class="flex items-center justify-end gap-2">
              <CallButton :e164="row.phoneE164" />
              <WhatsAppButton :e164="row.phoneE164" />
              <input
                type="date"
                :value="storedToDateInput(row.nextFollowUpAt)"
                class="rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted"
                @change="emit('reschedule', row.id, ($event.target as HTMLInputElement).value)"
              >
              <button class="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-muted hover:border-line-strong hover:text-ink" @click="emit('done', row.id)">Done</button>
            </div>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="5" class="py-16 text-center">
            <div class="flex flex-col items-center gap-3">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-faint">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              <div>
                <p class="font-medium text-ink">Nothing due</p>
                <p class="mt-0.5 text-sm text-faint">No callbacks are due today. Schedule one from a lead's detail panel.</p>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
