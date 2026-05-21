<script setup lang="ts">
defineProps<{ label: string; color?: string }>()
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :style="{ backgroundColor: (color ?? '#6b7280') + '22', color: color ?? '#6b7280' }"
  >{{ label }}</span>
</template>
