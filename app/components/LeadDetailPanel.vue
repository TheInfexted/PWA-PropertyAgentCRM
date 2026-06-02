<script setup lang="ts">
import { storedToDateInput, dateInputToStored } from '~~/shared/utils/followup'
import { OPTIONAL_FIELD_LABELS, type OptionalFieldKey } from '~~/shared/types'
import { optionalFieldDisplay, type OptionalFieldSource } from '~/utils/optionalFields'

const props = defineProps<{ leadId: number }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const { data: lead, refresh } = useFetch(`/api/leads/${props.leadId}`, { lazy: true })
const { data: activities } = useFetch(`/api/leads/${props.leadId}/activities`, { lazy: true })
const { update } = useLeads()
const toast = useToast()

const { session } = useUserSession()
const isOwner = computed(() => (session.value as { role?: string } | null)?.role === 'owner')
const { data: members } = useFetch('/api/members', { lazy: true, immediate: isOwner.value, default: () => [] })

const ws = useWorkspaceSettings()
const { enabledFields } = ws
onMounted(() => { ws.load() })
function optDisplay(key: OptionalFieldKey) {
  return optionalFieldDisplay((lead.value ?? {}) as OptionalFieldSource, key)
}

async function assign(userId: number) {
  try {
    await update(props.leadId, { assignedTo: userId })
    await refresh()
    emit('changed')
    toast.success('Lead reassigned')
  } catch {
    toast.error('Could not reassign the lead')
  }
}

const followUp = ref('')
watch(lead, (l) => {
  followUp.value = storedToDateInput((l as { nextFollowUpAt?: string | null })?.nextFollowUpAt ?? null)
})

const saving = ref(false)
async function saveFollowUp(value: string | null) {
  saving.value = true
  try {
    await update(props.leadId, { nextFollowUpAt: value })
    await refresh()
    emit('changed')
    toast.success(value ? 'Follow-up updated' : 'Follow-up cleared')
  } catch {
    toast.error('Could not update the follow-up')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-20 bg-ink/20" @click="emit('close')" />
  <div class="fixed inset-y-0 right-0 z-30 w-96 overflow-y-auto border-l border-line bg-surface p-6 shadow-pop">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-ink">{{ lead?.name || 'Lead' }}</h2>
      <button class="text-faint hover:text-ink" @click="emit('close')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <dl class="space-y-2.5 text-sm">
      <div><dt class="text-xs uppercase tracking-wide text-faint">Phone</dt><dd class="font-mono text-ink">{{ lead?.phoneE164 || lead?.phoneRaw || '—' }}</dd></div>
      <div><dt class="text-xs uppercase tracking-wide text-faint">Area</dt><dd class="text-ink">{{ lead?.area || '—' }}</dd></div>
      <div><dt class="text-xs uppercase tracking-wide text-faint">Remarks</dt><dd class="text-ink">{{ lead?.remarks || '—' }}</dd></div>
      <div v-for="key in enabledFields" :key="key">
        <dt class="text-xs uppercase tracking-wide text-faint">{{ OPTIONAL_FIELD_LABELS[key] }}</dt>
        <dd class="text-ink">{{ optDisplay(key) || '—' }}</dd>
      </div>
    </dl>

    <div class="mt-5 rounded-lg border border-line bg-canvas/50 p-3">
      <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint">Next follow-up</label>
      <div class="flex items-center gap-2">
        <input
          v-model="followUp"
          type="date"
          class="flex-1 rounded-md border border-line bg-surface px-3 py-1.5 text-sm"
          :disabled="saving"
          @change="saveFollowUp(dateInputToStored(followUp))"
        >
        <button
          v-if="followUp"
          class="rounded-md px-2.5 py-1.5 text-sm text-muted hover:text-ink"
          :disabled="saving"
          @click="followUp = ''; saveFollowUp(null)"
        >Clear</button>
      </div>
    </div>

    <div v-if="isOwner && (members ?? []).length > 1" class="mt-4 rounded-lg border border-line bg-canvas/50 p-3">
      <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint">Assigned to</label>
      <select
        class="w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm"
        :value="lead?.assignedTo ?? ''"
        @change="assign(Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="m in members ?? []" :key="m.userId" :value="m.userId">{{ m.name }} ({{ m.role }})</option>
      </select>
    </div>

    <h3 class="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Activity</h3>
    <ul class="space-y-2 text-xs text-muted">
      <li v-for="a in (activities ?? [])" :key="a.id" class="flex items-center gap-2">
        <span class="h-1.5 w-1.5 rounded-full bg-line" />
        <span>{{ a.type }} · {{ new Date(a.createdAt).toLocaleString() }}</span>
      </li>
    </ul>
  </div>
</template>
