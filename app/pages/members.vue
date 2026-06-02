<script setup lang="ts">
const team = useTeam()
const toast = useToast()
const { user } = useUserSession()
const meId = computed(() => (user.value as { id?: number } | null)?.id ?? null)

const resetFor = ref<number | null>(null)
const newPw = ref('')

async function changeRole(m: { userId: number; name: string; role: string }, role: 'owner' | 'agent') {
  if (role === m.role) return
  try {
    await team.changeRole(m.userId, role)
    await refreshMembers()
    toast.success(`${m.name} is now ${role}`)
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Could not change role')
    await refreshMembers()
  }
}
function toggleReset(userId: number) {
  resetFor.value = resetFor.value === userId ? null : userId
  newPw.value = ''
}
async function saveReset(userId: number) {
  if (newPw.value.length < 8) { toast.error('Password must be at least 8 characters'); return }
  try {
    await team.resetPassword(userId, newPw.value)
    toast.success('Password updated — share it with the agent')
    resetFor.value = null
    newPw.value = ''
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Could not reset the password')
  }
}
async function removeMember(m: { userId: number; name: string }) {
  if (!confirm(`Remove ${m.name}? Their leads will be reassigned to you.`)) return
  try {
    await team.removeMember(m.userId)
    await refreshMembers()
    toast.success(`${m.name} removed`)
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Could not remove the member')
  }
}
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
    toast.success('Invite link created')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Could not create the invite'
    toast.error(error.value)
  } finally {
    busy.value = false
  }
}
async function copyLink() {
  if (!lastLink.value) return
  await navigator.clipboard?.writeText(lastLink.value)
  toast.success('Link copied')
}
async function revoke(id: number) {
  try {
    await team.revokeInvite(id)
    await refreshInvites()
    toast.success('Invite revoked')
  } catch {
    toast.error('Could not revoke the invite')
  }
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
        <div v-for="m in members ?? []" :key="m.userId" class="border-b border-line last:border-b-0">
          <div class="flex items-center justify-between gap-3 px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-ink">{{ m.name }} <span v-if="m.userId === meId" class="text-xs font-normal text-faint">(you)</span></p>
              <p class="truncate text-xs text-muted">{{ m.email }}</p>
            </div>
            <div v-if="m.userId === meId" class="shrink-0">
              <span class="rounded-full border border-line px-2 py-0.5 text-xs font-medium capitalize text-muted">{{ m.role }}</span>
            </div>
            <div v-else class="flex shrink-0 items-center gap-2">
              <select
                class="rounded-md border border-line bg-surface px-2 py-1 text-xs capitalize"
                :value="m.role"
                @change="changeRole(m, ($event.target as HTMLSelectElement).value as 'owner' | 'agent')"
              >
                <option value="owner">owner</option>
                <option value="agent">agent</option>
              </select>
              <button class="rounded-md border border-line px-2 py-1 text-xs font-medium text-muted hover:text-ink" @click="toggleReset(m.userId)">Reset password</button>
              <button class="rounded-md px-2 py-1 text-xs font-medium text-muted hover:text-red-600" @click="removeMember(m)">Remove</button>
            </div>
          </div>
          <div v-if="resetFor === m.userId" class="flex items-center gap-2 border-t border-line bg-canvas/50 px-4 py-3">
            <input v-model="newPw" type="text" placeholder="New password (min 8 chars)" class="flex-1 rounded-md border border-line bg-surface px-3 py-1.5 text-sm" @keyup.enter="saveReset(m.userId)">
            <button class="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-strong" @click="saveReset(m.userId)">Set password</button>
            <button class="rounded-md px-2 py-1.5 text-sm text-faint hover:text-ink" @click="toggleReset(m.userId)">Cancel</button>
          </div>
        </div>
      </div>
      <p class="mt-2 text-xs text-faint">Changing a role takes effect on the member's next page load. Removing a member reassigns their leads to you.</p>
    </section>
  </div>
</template>
