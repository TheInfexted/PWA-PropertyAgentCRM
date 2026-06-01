<script setup lang="ts">
const { user } = useUserSession()
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/login')
}

const initials = computed(() => {
  const name = (user.value as { name?: string } | null)?.name ?? ''
  return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
})
</script>

<template>
  <div class="flex min-h-dvh bg-canvas text-ink">
    <!-- Sidebar -->
    <aside class="w-60 shrink-0 border-r border-line bg-surface p-5 flex flex-col">
      <!-- Brand mark -->
      <div class="mb-8 flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-md bg-accent flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 6.5l7.5 6.2V24a1.2 1.2 0 0 1-1.2 1.2h-4.1v-6.1h-4.4v6.1H10.2A1.2 1.2 0 0 1 9 24V12.7z" fill="white"/>
            <circle cx="16" cy="13.2" r="1.7" fill="#9e5733"/>
          </svg>
        </div>
        <span class="font-semibold tracking-tight text-ink text-[15px]">Property CRM</span>
      </div>

      <!-- Nav -->
      <nav class="space-y-0.5 text-sm flex-1">
        <NuxtLink
          to="/"
          class="flex items-center gap-2.5 rounded-md px-3 py-2 text-muted hover:bg-canvas hover:text-ink transition-colors"
          active-class="bg-accent-soft text-accent font-medium"
          exact
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Leads
        </NuxtLink>
      </nav>
    </aside>

    <!-- Main area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Topbar -->
      <header class="bg-surface/80 backdrop-blur border-b border-line px-6 py-3 flex items-center justify-between shrink-0">
        <div></div>
        <div class="flex items-center gap-3">
          <!-- Initials avatar -->
          <div class="w-7 h-7 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold select-none">
            {{ initials }}
          </div>
          <span class="text-sm text-muted">{{ (user as { name?: string } | null)?.name }}</span>
          <button class="text-sm text-muted hover:text-ink" @click="logout">Log out</button>
        </div>
      </header>

      <main class="p-8">
        <div class="max-w-[1400px] mx-auto">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
