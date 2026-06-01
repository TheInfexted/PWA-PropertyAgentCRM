<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
const props = defineProps<{ statuses: StatusRow[] }>()
const emit = defineEmits<{ created: []; close: [] }>()
const form = reactive({ name: '', phone: '', area: '', statusId: props.statuses[0]?.id ?? null, remarks: '' })
const error = ref('')
const { create } = useLeads()

async function submit() {
  error.value = ''
  try {
    await create({ ...form })
    emit('created')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Could not save the lead'
  }
}
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 z-30 grid place-items-center bg-ink/30 backdrop-blur-sm" @click.self="emit('close')">
    <!-- Card -->
    <div class="relative z-10 w-[26rem] rounded-xl bg-surface p-6 shadow-pop border border-line">
      <h2 class="mb-4 text-base font-semibold tracking-tight">New lead</h2>

      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Name</label>
          <input v-model="form.name" placeholder="Full name" class="w-full rounded-md border border-line px-3 py-2 text-sm">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Phone</label>
          <input v-model="form.phone" placeholder="+60 12 345 6789" class="w-full rounded-md border border-line px-3 py-2 text-sm font-mono">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Area</label>
          <input v-model="form.area" placeholder="e.g. Petaling Jaya" class="w-full rounded-md border border-line px-3 py-2 text-sm">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Status</label>
          <select v-model.number="form.statusId" class="w-full rounded-md border border-line px-3 py-2 text-sm">
            <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Remarks</label>
          <textarea v-model="form.remarks" placeholder="Notes about this lead…" class="w-full rounded-md border border-line px-3 py-2 text-sm resize-none h-20" />
        </div>
      </div>

      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>

      <div class="mt-5 flex justify-end gap-2">
        <button class="text-sm text-muted hover:text-ink px-3 py-2" @click="emit('close')">Cancel</button>
        <button class="bg-accent text-white rounded-md px-4 py-2 text-sm font-semibold hover:bg-accent-strong active:translate-y-px" @click="submit">Save</button>
      </div>
    </div>
  </div>
</template>
