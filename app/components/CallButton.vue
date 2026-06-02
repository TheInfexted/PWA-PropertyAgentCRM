<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
const props = defineProps<{ e164: string | null; leadId?: number; statuses?: StatusRow[] }>()
const emit = defineEmits<{ logged: [] }>()
const { logCall } = useLeads()
const toast = useToast()
const open = ref(false)

async function onCall() {
  if (props.e164) {
    await navigator.clipboard?.writeText(props.e164)
    toast.success('Number copied')
  }
  if (props.leadId) open.value = true // the tel: href still fires; this just prompts the outcome
}
async function pick(statusId: number | null) {
  open.value = false
  if (!props.leadId) return
  try {
    await logCall(props.leadId, statusId)
    toast.success('Call logged')
  } catch {
    toast.error('Could not log the call')
  } finally {
    emit('logged')
  }
}
</script>

<template>
  <div class="relative inline-block">
    <a
      v-if="e164"
      :href="`tel:${e164}`"
      class="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-white shadow-card hover:bg-accent-strong active:translate-y-px"
      @click="onCall"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.45 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.91-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
      Call
    </a>
    <span v-else class="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-faint">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.45 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.91-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
      Call
    </span>

    <template v-if="open">
      <div class="fixed inset-0 z-30" @click="open = false" />
      <div class="absolute right-0 z-40 mt-1.5 w-52 rounded-lg border border-line bg-surface p-1.5 shadow-pop">
        <p class="px-2 py-1.5 text-xs font-medium text-faint">How'd it go?</p>
        <button
          v-for="s in statuses ?? []"
          :key="s.id"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted hover:bg-canvas hover:text-ink"
          @click="pick(s.id)"
        >
          <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: s.color }" />{{ s.label }}
        </button>
        <button class="mt-1 w-full rounded-md border-t border-line px-2 py-1.5 text-left text-xs text-faint hover:text-ink" @click="pick(null)">Just log the call</button>
      </div>
    </template>
  </div>
</template>
