<script setup lang="ts">
const route = useRoute()
const { user } = useUserSession()
const menuOpen = ref(false)

const titles: Record<string, string> = { '/': 'Leads', '/import': 'Import' }
const pageTitle = computed(() => titles[route.path] ?? '')
const userName = computed(() => (user.value as { name?: string } | null)?.name ?? '')
const initials = computed(
  () => userName.value.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?',
)

async function logout() {
  menuOpen.value = false
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/login')
}
</script>

<template>
  <div class="flex min-h-dvh bg-canvas text-ink">
    <!-- Sidebar -->
    <aside class="flex w-60 shrink-0 flex-col border-r border-line bg-surface p-4">
      <!-- Brand mark -->
      <div class="mb-7 flex items-center gap-2.5 px-1">
        <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent">
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 6.5l7.5 6.2V24a1.2 1.2 0 0 1-1.2 1.2h-4.1v-6.1h-4.4v6.1H10.2A1.2 1.2 0 0 1 9 24V12.7z" fill="white"/>
            <circle cx="16" cy="13.2" r="1.7" fill="#9e5733"/>
          </svg>
        </div>
        <span class="text-[15px] font-semibold tracking-tight text-ink">Property CRM</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 space-y-0.5 text-sm">
        <NuxtLink
          to="/"
          class="flex items-center gap-2.5 rounded-md px-3 py-2 text-muted transition-colors hover:bg-canvas hover:text-ink"
          active-class="bg-accent-soft text-accent font-medium"
          exact
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Leads
        </NuxtLink>
        <NuxtLink
          to="/import"
          class="flex items-center gap-2.5 rounded-md px-3 py-2 text-muted transition-colors hover:bg-canvas hover:text-ink"
          active-class="bg-accent-soft text-accent font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Import
        </NuxtLink>
      </nav>

      <!-- User menu (bottom) -->
      <div class="relative mt-2 border-t border-line pt-3">
        <button
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-canvas"
          @click="menuOpen = !menuOpen"
        >
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{{ initials }}</span>
          <span class="min-w-0 flex-1 truncate text-sm text-ink">{{ userName }}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-faint">
            <path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>
          </svg>
        </button>

        <div v-if="menuOpen">
          <div class="fixed inset-0 z-10" @click="menuOpen = false" />
          <div class="absolute bottom-full left-0 z-20 mb-1.5 w-full overflow-hidden rounded-md border border-line bg-surface p-1 shadow-pop">
            <button
              class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted transition-colors hover:bg-canvas hover:text-ink"
              @click="logout"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Log out
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface/80 px-6 backdrop-blur">
        <h1 class="text-base font-semibold tracking-tight text-ink">{{ pageTitle }}</h1>
        <div id="topbar-actions" class="flex items-center gap-2" />
      </header>
      <main class="p-8">
        <div class="mx-auto max-w-[1400px]">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
