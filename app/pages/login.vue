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
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="w-80 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h1 class="mb-4 text-lg font-semibold">Sign in</h1>
      <div class="space-y-2">
        <input v-model="email" type="email" placeholder="Email" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
        <input v-model="password" type="password" placeholder="Password" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" @keyup.enter="submit">
      </div>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
      <button class="mt-4 w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white" @click="submit">Sign in</button>
    </div>
  </div>
</template>
