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
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="w-96 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h1 class="mb-1 text-lg font-semibold">Create your workspace</h1>
      <p class="mb-4 text-sm text-gray-500">First-run setup — this account becomes the Owner.</p>
      <div class="space-y-2">
        <input v-model="form.name" placeholder="Your name" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
        <input v-model="form.email" type="email" placeholder="Email" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
        <input v-model="form.password" type="password" placeholder="Password (min 8 chars)" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
        <input v-model="form.workspaceName" placeholder="Workspace name (e.g. your agency)" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
      </div>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
      <button class="mt-4 w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white" @click="submit">Create workspace</button>
    </div>
  </div>
</template>
