<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'

interface MemberOpt { userId: number; name: string }
defineProps<{ statuses: StatusRow[]; members?: MemberOpt[]; isOwner?: boolean }>()

const search = defineModel<string>('search', { default: '' })
const statusId = defineModel<number | null>('statusId', { default: null })
const area = defineModel<string>('area', { default: '' })
const assignedTo = defineModel<number | null>('assignedTo', { default: null })
const dueOnly = defineModel<boolean>('dueOnly', { default: false })
const sort = defineModel<'name' | 'createdAt' | 'area'>('sort', { default: 'createdAt' })
const dir = defineModel<'asc' | 'desc'>('dir', { default: 'desc' })

function clearAll() {
  search.value = ''
  statusId.value = null
  area.value = ''
  assignedTo.value = null
  dueOnly.value = false
  sort.value = 'createdAt'
  dir.value = 'desc'
}
const sel = 'rounded-md border border-line bg-surface px-3 py-2 text-sm'
</script>

<template>
  <div class="mb-5 flex flex-wrap items-center gap-3">
    <div class="relative">
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <input v-model="search" type="search" placeholder="Search name or phone…" class="w-64 rounded-md border border-line bg-surface py-2 pl-9 pr-3 text-sm">
    </div>

    <select :class="sel" :value="statusId ?? ''" @change="statusId = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null">
      <option value="">All statuses</option>
      <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
    </select>

    <input v-model="area" type="text" placeholder="Area" class="w-32 rounded-md border border-line bg-surface px-3 py-2 text-sm">

    <select v-if="isOwner && members?.length" :class="sel" :value="assignedTo ?? ''" @change="assignedTo = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null">
      <option value="">All agents</option>
      <option v-for="m in members" :key="m.userId" :value="m.userId">{{ m.name }}</option>
    </select>

    <label class="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted">
      <input v-model="dueOnly" type="checkbox" class="accent-accent"> Due only
    </label>

    <select :class="sel" v-model="sort">
      <option value="createdAt">Newest</option>
      <option value="name">Name</option>
      <option value="area">Area</option>
    </select>
    <button class="rounded-md border border-line bg-surface px-2.5 py-2 text-sm text-muted hover:text-ink" :aria-label="dir === 'asc' ? 'Ascending' : 'Descending'" @click="dir = dir === 'asc' ? 'desc' : 'asc'">
      {{ dir === 'asc' ? '↑' : '↓' }}
    </button>

    <button class="ml-auto rounded-md px-2.5 py-2 text-sm text-faint hover:text-ink" @click="clearAll">Clear</button>
  </div>
</template>
