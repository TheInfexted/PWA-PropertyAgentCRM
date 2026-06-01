<script setup lang="ts">
definePageMeta({ layout: false })
const form = reactive({ name: '', email: '', password: '', workspaceName: '' })
const error = ref('')
const { fetch: fetchSession } = useUserSession()

async function submit() {
  error.value = ''
  try {
    await $fetch('/api/auth/setup', { method: 'POST', body: { ...form } })
    await fetchSession()
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Setup failed'
  }
}
</script>

<template>
  <div class="min-h-dvh grid place-items-center bg-canvas relative">
    <!-- Blueprint dot grid -->
    <div
      class="absolute inset-0 pointer-events-none"
      style="background-image: radial-gradient(var(--color-line-strong) 1px, transparent 1px); background-size: 22px 22px; opacity: 0.4;"
    />

    <!-- Card -->
    <div class="relative z-10 w-[26rem] rounded-xl bg-surface p-7 shadow-pop border border-line">
      <!-- Brand mark -->
      <div class="mb-6 flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-md bg-accent flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 6.5l7.5 6.2V24a1.2 1.2 0 0 1-1.2 1.2h-4.1v-6.1h-4.4v6.1H10.2A1.2 1.2 0 0 1 9 24V12.7z" fill="white"/>
            <circle cx="16" cy="13.2" r="1.7" fill="#2f54eb"/>
          </svg>
        </div>
        <span class="font-semibold tracking-tight text-ink text-[15px]">Property CRM</span>
      </div>

      <h1 class="text-xl font-semibold tracking-tight mb-0.5">Create your workspace</h1>
      <p class="text-sm text-muted mb-5">First-run setup — this account becomes the owner.</p>

      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Your name</label>
          <input v-model="form.name" placeholder="Full name" class="w-full rounded-md border border-line px-3 py-2 text-sm">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Email</label>
          <input v-model="form.email" type="email" placeholder="you@example.com" class="w-full rounded-md border border-line px-3 py-2 text-sm">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Password</label>
          <input v-model="form.password" type="password" placeholder="Min 8 characters" class="w-full rounded-md border border-line px-3 py-2 text-sm">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Workspace name</label>
          <input v-model="form.workspaceName" placeholder="e.g. your agency" class="w-full rounded-md border border-line px-3 py-2 text-sm">
        </div>
      </div>

      <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

      <button class="mt-5 w-full rounded-md bg-accent py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px" @click="submit">
        Create workspace
      </button>
    </div>
  </div>
</template>
