<script setup lang="ts">
const team = useTeam()
const { data: members, refresh: refreshMembers } = await useAsyncData('members', () => team.listMembers())
const { data: invites, refresh: refreshInvites } = await useAsyncData('invites', () => team.listInvites())

const email = ref('')
const lastLink = ref('')
const busy = ref(false)
const error = ref('')

async function invite() {
  if (!email.value.trim() || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const res = await team.createInvite(email.value.trim())
    lastLink.value = team.linkFor(res.token)
    email.value = ''
    await refreshInvites()
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Could not create the invite'
  } finally {
    busy.value = false
  }
}
async function copyLink() {
  if (lastLink.value) await navigator.clipboard?.writeText(lastLink.value)
}
async function revoke(id: number) {
  await team.revokeInvite(id)
  await refreshInvites()
}
</script>

<template>
  <div class="max-w-2xl space-y-8">
    <section>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">Invite an agent</h2>
      <div class="rounded-lg border border-line bg-surface p-4 shadow-card">
        <div class="flex gap-2">
          <input v-model="email" type="email" placeholder="agent@email.com" class="flex-1 rounded-md border border-line bg-card px-3 py-2 text-sm" @keyup.enter="invite">
          <button :disabled="busy" class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px disabled:opacity-60" @click="invite">Create link</button>
        </div>
        <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
        <div v-if="lastLink" class="mt-3 rounded-md border border-line bg-canvas/60 p-2.5">
          <p class="mb-1 text-xs text-faint">Send this link to your agent (it works once, expires in 7 days):</p>
          <div class="flex items-center gap-2">
            <code class="flex-1 truncate rounded bg-surface px-2 py-1 font-mono text-xs text-ink">{{ lastLink }}</code>
            <button class="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-muted hover:text-ink" @click="copyLink">Copy</button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="(invites ?? []).length">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">Pending invites</h2>
      <div class="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        <div v-for="inv in invites ?? []" :key="inv.id" class="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0">
          <span class="text-sm text-ink">{{ inv.email }}</span>
          <button class="text-xs font-medium text-muted hover:text-red-600" @click="revoke(inv.id)">Revoke</button>
        </div>
      </div>
    </section>

    <section>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">Members</h2>
      <div class="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        <div v-for="m in members ?? []" :key="m.userId" class="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0">
          <div>
            <p class="text-sm font-medium text-ink">{{ m.name }}</p>
            <p class="text-xs text-muted">{{ m.email }}</p>
          </div>
          <span class="rounded-full border border-line px-2 py-0.5 text-xs font-medium capitalize text-muted">{{ m.role }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
