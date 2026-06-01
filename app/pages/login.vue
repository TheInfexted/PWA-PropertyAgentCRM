<script setup lang="ts">
definePageMeta({ layout: false })
const email = ref('')
const password = ref('')
const error = ref('')
const { fetch: fetchSession } = useUserSession()

async function submit() {
  error.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
    await fetchSession()
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Login failed'
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
    <div class="relative z-10 w-[22rem] rounded-xl bg-surface p-7 shadow-pop border border-line">
      <!-- Brand mark -->
      <div class="mb-6 flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-md bg-accent flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 6.5l7.5 6.2V24a1.2 1.2 0 0 1-1.2 1.2h-4.1v-6.1h-4.4v6.1H10.2A1.2 1.2 0 0 1 9 24V12.7z" fill="white"/>
            <circle cx="16" cy="13.2" r="1.7" fill="#9e5733"/>
          </svg>
        </div>
        <span class="font-semibold tracking-tight text-ink text-[15px]">Property CRM</span>
      </div>

      <h1 class="text-xl font-semibold tracking-tight mb-0.5">Sign in</h1>
      <p class="text-sm text-muted mb-5">Welcome back.</p>

      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Email</label>
          <input v-model="email" type="email" placeholder="you@example.com" class="w-full rounded-md border border-line px-3 py-2 text-sm">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Password</label>
          <input v-model="password" type="password" placeholder="••••••••" class="w-full rounded-md border border-line px-3 py-2 text-sm" @keyup.enter="submit">
        </div>
      </div>

      <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

      <button class="mt-5 w-full rounded-md bg-accent py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px" @click="submit">
        Sign in
      </button>
    </div>
  </div>
</template>
