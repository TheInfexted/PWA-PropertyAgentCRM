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
    class="inline-flex items-center rounded-md border border-green-500 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
  >WA</a>
  <span v-else class="inline-flex items-center rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-300">WA</span>
</template>
