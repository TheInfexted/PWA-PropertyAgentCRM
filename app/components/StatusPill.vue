<script setup lang="ts">
defineProps<{ label: string; color?: string }>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
    :style="{
      backgroundColor: `color-mix(in srgb, ${color ?? '#8b93a1'} 12%, transparent)`,
      color: color ?? '#8b93a1',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: `color-mix(in srgb, ${color ?? '#8b93a1'} 24%, transparent)`,
    }"
  >
    <span
      class="w-1.5 h-1.5 rounded-full shrink-0"
      :style="{ backgroundColor: color ?? '#8b93a1' }"
    />
    {{ label }}
  </span>
</template>
