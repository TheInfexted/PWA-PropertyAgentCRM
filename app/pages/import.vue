<script setup lang="ts">
const done = ref<number | null>(null)
function onImported(count: number) {
  done.value = count
}
</script>

<template>
  <div>
    <div class="mb-5">
      <h1 class="text-2xl font-semibold tracking-tight">Import leads</h1>
      <p class="text-sm text-muted">Bring your spreadsheet into the CRM. Phones get cleaned and duplicates flagged automatically.</p>
    </div>

    <div v-if="done !== null" class="rounded-lg border border-line bg-surface p-6 shadow-card">
      <p class="text-ink font-medium">Imported {{ done }} {{ done === 1 ? 'lead' : 'leads' }}.</p>
      <div class="mt-3 flex gap-2">
        <NuxtLink to="/" class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px">View leads</NuxtLink>
        <button class="rounded-md px-3 py-2 text-sm text-muted hover:text-ink" @click="done = null">Import more</button>
      </div>
    </div>

    <ImportWizard v-else @imported="onImported" />
  </div>
</template>
