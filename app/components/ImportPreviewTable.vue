<script setup lang="ts">
import type { AnnotatedRow } from '~~/shared/utils/import'
defineProps<{ rows: AnnotatedRow[] }>()

function rowState(r: AnnotatedRow): { label: string; cls: string } {
  if (!r.valid) return { label: 'Skipped', cls: 'bg-red-50 text-red-700 border-red-200' }
  if (r.duplicate === 'in-batch') return { label: 'Repeat', cls: 'bg-canvas text-faint border-line' }
  if (r.duplicate === 'existing') return { label: 'Duplicate', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: 'New', cls: 'bg-accent-soft text-accent border-line' }
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
    <table class="w-full text-sm">
      <thead class="bg-canvas/60">
        <tr>
          <th class="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Name</th>
          <th class="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Phone</th>
          <th class="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Area</th>
          <th class="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Status</th>
          <th class="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line">Row</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.index" class="border-t border-line">
          <td class="px-4 py-2.5 font-medium text-ink">{{ r.name || '—' }}</td>
          <td class="px-4 py-2.5 font-mono text-[13px]" :class="r.phoneValid ? 'text-muted' : 'text-red-600'">
            {{ r.phoneE164 || r.phoneRaw || '—' }}
          </td>
          <td class="px-4 py-2.5 text-muted">{{ r.area || '—' }}</td>
          <td class="px-4 py-2.5 text-muted">{{ r.statusLabel || '—' }}</td>
          <td class="px-4 py-2.5">
            <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium" :class="rowState(r).cls">
              {{ rowState(r).label }}
            </span>
            <span v-if="r.error" class="ml-2 text-xs text-red-600">{{ r.error }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
