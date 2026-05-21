<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'

interface LeadRow {
  id: number; name: string; phoneE164: string | null; phoneRaw: string | null
  area: string; statusId: number | null; remarks: string | null
}
defineProps<{ rows: LeadRow[]; statuses: StatusRow[] }>()
const emit = defineEmits<{ open: [id: number]; statusChange: [id: number, statusId: number] }>()
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th class="px-4 py-2 text-left">Name</th>
          <th class="px-4 py-2 text-left">Phone</th>
          <th class="px-4 py-2 text-left">Area</th>
          <th class="px-4 py-2 text-left">Status</th>
          <th class="px-4 py-2 text-right">Contact</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" class="border-t border-gray-100 hover:bg-gray-50">
          <td class="cursor-pointer px-4 py-2 font-medium" @click="emit('open', row.id)">{{ row.name || '—' }}</td>
          <td class="px-4 py-2 font-mono text-gray-700">{{ row.phoneE164 || row.phoneRaw || '—' }}</td>
          <td class="px-4 py-2 text-gray-700">{{ row.area || '—' }}</td>
          <td class="px-4 py-2">
            <StatusSelect
              :model-value="row.statusId"
              :statuses="statuses"
              @update:model-value="(v) => emit('statusChange', row.id, v)"
            />
          </td>
          <td class="px-4 py-2">
            <div class="flex justify-end gap-2">
              <CallButton :e164="row.phoneE164" />
              <WhatsAppButton :e164="row.phoneE164" />
            </div>
          </td>
        </tr>
        <tr v-if="!rows.length"><td colspan="5" class="px-4 py-10 text-center text-gray-400">No leads yet — add one or import your sheet.</td></tr>
      </tbody>
    </table>
  </div>
</template>
