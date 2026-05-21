<script setup lang="ts">
const props = defineProps<{ e164: string | null }>()
async function copyNumber() {
  if (props.e164) await navigator.clipboard?.writeText(props.e164)
}
</script>

<template>
  <a
    v-if="e164"
    :href="`tel:${e164}`"
    class="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
    @click="copyNumber"
  >Call</a>
  <span v-else class="inline-flex items-center rounded-md bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-400">Call</span>
</template>
