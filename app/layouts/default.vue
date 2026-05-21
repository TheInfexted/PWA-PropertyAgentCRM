<script setup lang="ts">
const { user } = useUserSession()
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/login')
}
</script>

<template>
  <div class="flex min-h-screen bg-gray-50 text-gray-900">
    <aside class="w-56 shrink-0 border-r border-gray-200 bg-white p-4">
      <div class="mb-6 text-lg font-bold">Property CRM</div>
      <nav class="space-y-1 text-sm">
        <NuxtLink to="/" class="block rounded-md px-3 py-2 hover:bg-gray-100">Leads</NuxtLink>
      </nav>
    </aside>
    <div class="flex-1">
      <header class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div class="text-sm text-gray-500">{{ (user as { name?: string } | null)?.name }}</div>
        <button class="text-sm text-gray-500 hover:text-gray-900" @click="logout">Log out</button>
      </header>
      <main class="p-6"><slot /></main>
    </div>
  </div>
</template>
