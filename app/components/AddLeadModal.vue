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
  <div class="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
    <div class="w-96 rounded-lg bg-white p-5 shadow-xl">
      <h2 class="mb-3 text-base font-semibold">New lead</h2>
      <div class="space-y-2">
        <input v-model="form.name" placeholder="Name" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm">
        <input v-model="form.phone" placeholder="Phone" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm">
        <input v-model="form.area" placeholder="Area" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm">
        <select v-model.number="form.statusId" class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
          <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
        <textarea v-model="form.remarks" placeholder="Remarks" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
      </div>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-md px-3 py-1.5 text-sm text-gray-600" @click="emit('close')">Cancel</button>
        <button class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white" @click="submit">Save</button>
      </div>
    </div>
  </div>
</template>
