<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'

interface LeadRow {
  id: number; name: string; phoneE164: string | null; phoneRaw: string | null
  area: string; statusId: number | null; remarks: string | null
}
defineProps<{ rows: LeadRow[]; statuses: StatusRow[]; loading?: boolean }>()
const emit = defineEmits<{ open: [id: number]; statusChange: [id: number, statusId: number] }>()
</script>

<template>
  <div class="rounded-lg border border-line bg-surface shadow-card overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-canvas/60">
        <tr>
          <th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Name</th>
          <th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Phone</th>
          <th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Area</th>
          <th class="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Status</th>
          <th class="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Contact</th>
        </tr>
      </thead>
      <tbody>
        <!-- Skeleton rows when loading -->
        <template v-if="loading">
          <tr v-for="i in 6" :key="`skel-${i}`" class="border-t border-line">
            <td class="px-5 py-3.5">
              <div class="h-3.5 w-32 rounded bg-line animate-pulse" />
            </td>
            <td class="px-5 py-3.5">
              <div class="h-3.5 w-28 rounded bg-line animate-pulse" />
            </td>
            <td class="px-5 py-3.5">
              <div class="h-3.5 w-20 rounded bg-line animate-pulse" />
            </td>
            <td class="px-5 py-3.5">
              <div class="h-5 w-24 rounded-full bg-line animate-pulse" />
            </td>
            <td class="px-5 py-3.5">
              <div class="flex justify-end gap-2">
                <div class="h-6 w-14 rounded-md bg-line animate-pulse" />
                <div class="h-6 w-10 rounded-md bg-line animate-pulse" />
              </div>
            </td>
          </tr>
        </template>

        <!-- Data rows -->
        <template v-else>
          <tr v-for="row in rows" :key="row.id" class="border-t border-line hover:bg-accent-soft/40 transition-colors">
            <td class="px-5 py-3.5 font-medium text-ink cursor-pointer hover:text-accent transition-colors" @click="emit('open', row.id)">
              {{ row.name || '—' }}
            </td>
            <td class="px-5 py-3.5 font-mono text-[13px] text-muted">{{ row.phoneE164 || row.phoneRaw || '—' }}</td>
            <td class="px-5 py-3.5 text-muted">{{ row.area || '—' }}</td>
            <td class="px-5 py-3.5">
              <StatusSelect
                :model-value="row.statusId"
                :statuses="statuses"
                @update:model-value="(v) => emit('statusChange', row.id, v)"
              />
            </td>
            <td class="px-5 py-3.5">
              <div class="flex justify-end gap-2">
                <CallButton :e164="row.phoneE164" />
                <WhatsAppButton :e164="row.phoneE164" />
              </div>
            </td>
          </tr>

          <!-- Empty state -->
          <tr v-if="!rows.length">
            <td colspan="5" class="py-16 text-center">
              <div class="flex flex-col items-center gap-3">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-faint">
                  <rect x="5" y="2" width="14" height="20" rx="2"/>
                  <line x1="9" y1="7" x2="15" y2="7"/>
                  <line x1="9" y1="11" x2="15" y2="11"/>
                  <line x1="9" y1="15" x2="12" y2="15"/>
                </svg>
                <div>
                  <p class="text-ink font-medium">No leads yet</p>
                  <p class="text-faint text-sm mt-0.5">Add a lead or import your spreadsheet to get started.</p>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
