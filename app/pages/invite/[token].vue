<script setup lang="ts">
definePageMeta({ layout: false })
const route = useRoute()
const token = String(route.params.token ?? '')
const { fetch: fetchSession } = useUserSession()

const { data: invite, error: inviteError } = await useFetch('/api/invites/accept', { query: { token } })

const form = reactive({ name: '', password: '' })
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await $fetch('/api/invites/accept', { method: 'POST', body: { token, name: form.name, password: form.password } })
    await fetchSession()
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Could not accept the invite'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid min-h-dvh place-items-center bg-canvas px-4">
    <div class="w-[24rem] rounded-xl border border-line bg-surface p-7 shadow-pop">
      <div class="mb-6 flex items-center gap-2.5">
        <div class="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 6.5l7.5 6.2V24a1.2 1.2 0 0 1-1.2 1.2h-4.1v-6.1h-4.4v6.1H10.2A1.2 1.2 0 0 1 9 24V12.7z" fill="white"/>
            <circle cx="16" cy="13.2" r="1.7" fill="#9e5733"/>
          </svg>
        </div>
        <span class="text-[15px] font-semibold tracking-tight text-ink">Property CRM</span>
      </div>

      <div v-if="inviteError" class="text-sm text-muted">
        <p class="font-medium text-ink">This invite isn't valid.</p>
        <p class="mt-1">It may have expired or already been used. Ask the workspace owner for a new link.</p>
      </div>

      <div v-else>
        <h1 class="text-lg font-semibold tracking-tight text-ink">Join {{ invite?.workspaceName }}</h1>
        <p class="mb-5 mt-0.5 text-sm text-muted">Setting up the account for {{ invite?.email }}.</p>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">Your name</label>
            <input v-model="form.name" class="w-full rounded-md border border-line px-3 py-2 text-sm">
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">Choose a password</label>
            <input v-model="form.password" type="password" placeholder="Min 8 characters" class="w-full rounded-md border border-line px-3 py-2 text-sm" @keyup.enter="submit">
          </div>
        </div>
        <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
        <button :disabled="busy" class="mt-5 w-full rounded-md bg-accent py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px disabled:opacity-60" @click="submit">
          {{ busy ? 'Joining…' : 'Join workspace' }}
        </button>
      </div>
    </div>
  </div>
</template>
