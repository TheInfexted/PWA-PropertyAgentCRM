<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
import { OPTIONAL_FIELD_LABELS, type OptionalFieldKey } from '~~/shared/types'
import { optionalFieldDisplay } from '~/utils/optionalFields'

interface LeadRow {
  id: number; name: string; phoneE164: string | null; phoneRaw: string | null
  area: string; statusId: number | null; remarks: string | null
  email?: string | null; intent?: string | null; propertyType?: string | null
  budgetMin?: number | null; budgetMax?: number | null; tags?: string[] | null
}
const props = defineProps<{
  rows: LeadRow[]; statuses: StatusRow[]; loading?: boolean
  sort?: string; dir?: string; enabledFields?: OptionalFieldKey[]
}>()
const emit = defineEmits<{
  open: [id: number]
  statusChange: [id: number, statusId: number]
  remarksChange: [id: number, remarks: string]
  logged: []
  sortBy: [col: 'name' | 'area' | 'createdAt']
}>()

const selected = defineModel<number[]>('selected', { default: () => [] })
const fields = computed(() => props.enabledFields ?? [])
const colspan = computed(() => 7 + fields.value.length)

const allChecked = computed(() => props.rows.length > 0 && props.rows.every((r) => selected.value.includes(r.id)))
const someChecked = computed(() => props.rows.some((r) => selected.value.includes(r.id)) && !allChecked.value)
function toggleAll() { selected.value = allChecked.value ? [] : props.rows.map((r) => r.id) }
function toggleOne(id: number) {
  selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id]
}
function arrow(col: string) {
  if (props.sort !== col) return ''
  return props.dir === 'asc' ? ' ↑' : ' ↓'
}
const th = 'px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-faint border-b border-line'
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
    <table class="w-full text-sm">
      <thead class="bg-canvas/60">
        <tr>
          <th class="w-10 border-b border-line px-4 py-3">
            <input type="checkbox" class="accent-accent" :checked="allChecked" :indeterminate.prop="someChecked" aria-label="Select all" @change="toggleAll">
          </th>
          <th :class="[th, 'cursor-pointer select-none']" @click="emit('sortBy', 'name')">Name{{ arrow('name') }}</th>
          <th :class="th">Phone</th>
          <th :class="[th, 'cursor-pointer select-none']" @click="emit('sortBy', 'area')">Area{{ arrow('area') }}</th>
          <th :class="th">Status</th>
          <th v-for="key in fields" :key="key" :class="th">{{ OPTIONAL_FIELD_LABELS[key] }}</th>
          <th :class="th">Remarks</th>
          <th :class="[th, 'text-right']">Contact</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="loading">
          <tr v-for="i in 6" :key="`skel-${i}`" class="border-t border-line">
            <td class="px-4 py-3.5"><div class="h-4 w-4 rounded bg-line animate-pulse" /></td>
            <td class="px-4 py-3.5"><div class="h-3.5 w-32 rounded bg-line animate-pulse" /></td>
            <td class="px-4 py-3.5"><div class="h-3.5 w-28 rounded bg-line animate-pulse" /></td>
            <td class="px-4 py-3.5"><div class="h-3.5 w-20 rounded bg-line animate-pulse" /></td>
            <td class="px-4 py-3.5"><div class="h-5 w-24 rounded-full bg-line animate-pulse" /></td>
            <td v-for="key in fields" :key="key" class="px-4 py-3.5"><div class="h-3.5 w-16 rounded bg-line animate-pulse" /></td>
            <td class="px-4 py-3.5"><div class="h-3.5 w-24 rounded bg-line animate-pulse" /></td>
            <td class="px-4 py-3.5"><div class="flex justify-end gap-2"><div class="h-6 w-14 rounded-md bg-line animate-pulse" /><div class="h-6 w-10 rounded-md bg-line animate-pulse" /></div></td>
          </tr>
        </template>

        <template v-else>
          <tr v-for="row in rows" :key="row.id" class="border-t border-line transition-colors hover:bg-accent-soft/40" :class="selected.includes(row.id) ? 'bg-accent-soft/30' : ''">
            <td class="px-4 py-3.5">
              <input type="checkbox" class="accent-accent" :checked="selected.includes(row.id)" :aria-label="`Select ${row.name || 'lead'}`" @change="toggleOne(row.id)">
            </td>
            <td class="cursor-pointer px-4 py-3.5 font-medium text-ink transition-colors hover:text-accent" @click="emit('open', row.id)">{{ row.name || '—' }}</td>
            <td class="px-4 py-3.5 font-mono text-[13px] text-muted">{{ row.phoneE164 || row.phoneRaw || '—' }}</td>
            <td class="px-4 py-3.5 text-muted">{{ row.area || '—' }}</td>
            <td class="px-4 py-3.5">
              <StatusSelect :model-value="row.statusId" :statuses="statuses" @update:model-value="(v) => emit('statusChange', row.id, v)" />
            </td>
            <td v-for="key in fields" :key="key" class="px-4 py-3.5 text-muted">{{ optionalFieldDisplay(row, key) || '—' }}</td>
            <td class="px-4 py-3.5">
              <input
                :value="row.remarks ?? ''"
                placeholder="—"
                class="w-40 rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] text-muted hover:border-line focus:border-accent focus:text-ink"
                @change="emit('remarksChange', row.id, ($event.target as HTMLInputElement).value)"
              >
            </td>
            <td class="px-4 py-3.5">
              <div class="flex justify-end gap-2">
                <CallButton :e164="row.phoneE164" :lead-id="row.id" :statuses="statuses" @logged="emit('logged')" />
                <WhatsAppButton :e164="row.phoneE164" />
              </div>
            </td>
          </tr>

          <tr v-if="!rows.length">
            <td :colspan="colspan" class="py-16 text-center">
              <div class="flex flex-col items-center gap-3">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-faint">
                  <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/>
                </svg>
                <div>
                  <p class="font-medium text-ink">No leads found</p>
                  <p class="mt-0.5 text-sm text-faint">Adjust your filters, add a lead, or import your spreadsheet.</p>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
