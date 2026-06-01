<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ e164: string | null }>()
const href = computed(() => (props.e164 ? `https://wa.me/${props.e164.replace(/[^\d]/g, '')}` : null))
</script>

<template>
  <a
    v-if="href"
    :href="href"
    target="_blank"
    rel="noopener"
    class="inline-flex items-center gap-1.5 rounded-md border border-wa/40 bg-wa/5 px-2.5 py-1.5 text-xs font-semibold text-wa hover:bg-wa/10 active:translate-y-px"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    WA
  </a>
  <span v-else class="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-faint cursor-not-allowed">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    WA
  </span>
</template>
