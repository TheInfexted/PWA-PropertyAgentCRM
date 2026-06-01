<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
const props = defineProps<{ statuses: StatusRow[] }>()
const emit = defineEmits<{ created: []; close: [] }>()
const { create } = useLeads()

const ws = useWorkspaceSettings()
const { areas, isEnabled } = ws
onMounted(() => { ws.load() })

const form = reactive({
  name: '', phone: '', area: '', statusId: props.statuses[0]?.id ?? null, remarks: '',
  email: '', intent: '' as '' | 'buy' | 'rent' | 'sell' | 'invest',
  propertyType: '', budgetMin: null as number | null, budgetMax: null as number | null, tagsText: '',
})
const error = ref('')

async function submit() {
  error.value = ''
  const body: Record<string, unknown> = {
    name: form.name, phone: form.phone, area: form.area, statusId: form.statusId, remarks: form.remarks,
  }
  if (isEnabled('email') && form.email.trim()) body.email = form.email.trim()
  if (isEnabled('intent') && form.intent) body.intent = form.intent
  if (isEnabled('propertyType') && form.propertyType.trim()) body.propertyType = form.propertyType.trim()
  if (isEnabled('budget')) {
    if (form.budgetMin != null) body.budgetMin = form.budgetMin
    if (form.budgetMax != null) body.budgetMax = form.budgetMax
  }
  if (isEnabled('tags') && form.tagsText.trim()) {
    body.tags = form.tagsText.split(',').map((t) => t.trim()).filter(Boolean)
  }
  try {
    await create(body as Parameters<typeof create>[0])
    emit('created')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Could not save the lead'
  }
}
const inp = 'w-full rounded-md border border-line px-3 py-2 text-sm'
</script>

<template>
  <div class="fixed inset-0 z-30 grid place-items-center bg-ink/30 backdrop-blur-sm" @click.self="emit('close')">
    <div class="relative z-10 max-h-[90vh] w-[26rem] overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-pop">
      <h2 class="mb-4 text-base font-semibold tracking-tight">New lead</h2>

      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Name</label>
          <input v-model="form.name" placeholder="Full name" :class="inp">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Phone</label>
          <input v-model="form.phone" placeholder="+60 12 345 6789" :class="`${inp} font-mono`">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Area</label>
          <input v-model="form.area" list="area-suggestions" placeholder="e.g. Petaling Jaya" :class="inp">
          <datalist id="area-suggestions">
            <option v-for="a in areas" :key="a" :value="a" />
          </datalist>
        </div>

        <div v-if="isEnabled('email')">
          <label class="mb-1 block text-xs font-medium text-muted">Email</label>
          <input v-model="form.email" type="email" placeholder="name@email.com" :class="inp">
        </div>
        <div v-if="isEnabled('intent')">
          <label class="mb-1 block text-xs font-medium text-muted">Intent</label>
          <select v-model="form.intent" :class="inp">
            <option value="">—</option>
            <option value="buy">Buy</option>
            <option value="rent">Rent</option>
            <option value="sell">Sell</option>
            <option value="invest">Invest</option>
          </select>
        </div>
        <div v-if="isEnabled('propertyType')">
          <label class="mb-1 block text-xs font-medium text-muted">Property type</label>
          <input v-model="form.propertyType" placeholder="e.g. Condo, Terrace" :class="inp">
        </div>
        <div v-if="isEnabled('budget')" class="flex gap-2">
          <div class="flex-1">
            <label class="mb-1 block text-xs font-medium text-muted">Budget min</label>
            <input v-model.number="form.budgetMin" type="number" min="0" placeholder="0" :class="`${inp} font-mono`">
          </div>
          <div class="flex-1">
            <label class="mb-1 block text-xs font-medium text-muted">Budget max</label>
            <input v-model.number="form.budgetMax" type="number" min="0" placeholder="0" :class="`${inp} font-mono`">
          </div>
        </div>
        <div v-if="isEnabled('tags')">
          <label class="mb-1 block text-xs font-medium text-muted">Tags</label>
          <input v-model="form.tagsText" placeholder="Comma separated, e.g. hot, referral" :class="inp">
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Status</label>
          <select v-model.number="form.statusId" :class="inp">
            <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Remarks</label>
          <textarea v-model="form.remarks" placeholder="Notes about this lead…" :class="`${inp} h-20 resize-none`" />
        </div>
      </div>

      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>

      <div class="mt-5 flex justify-end gap-2">
        <button class="px-3 py-2 text-sm text-muted hover:text-ink" @click="emit('close')">Cancel</button>
        <button class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px" @click="submit">Save</button>
      </div>
    </div>
  </div>
</template>
