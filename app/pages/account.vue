<script setup lang="ts">
import { fileToResizedDataUrl } from '~/utils/image'

const { account, load, updateProfile, changePassword } = useAccount()
const { fetch: fetchSession } = useUserSession()
const toast = useToast()

await load()

const name = ref(account.value?.name ?? '')
const avatar = ref<string | null>(account.value?.avatar ?? null)
const savingProfile = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const initials = computed(
  () => (name.value || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?',
)

async function onPickFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
  try {
    avatar.value = await fileToResizedDataUrl(file)
  } catch {
    toast.error('Could not process that image')
  }
}
function removeAvatar() { avatar.value = null }

async function saveProfile() {
  if (!name.value.trim()) { toast.error('Name cannot be empty'); return }
  savingProfile.value = true
  try {
    await updateProfile({ name: name.value.trim(), avatar: avatar.value })
    await fetchSession() // refresh the session so the sidebar name updates
    toast.success('Profile updated')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Could not update profile')
  } finally {
    savingProfile.value = false
  }
}

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const savingPw = ref(false)
async function savePassword() {
  if (newPassword.value.length < 8) { toast.error('New password must be at least 8 characters'); return }
  if (newPassword.value !== confirmPassword.value) { toast.error('Passwords do not match'); return }
  savingPw.value = true
  try {
    await changePassword(currentPassword.value, newPassword.value)
    currentPassword.value = ''; newPassword.value = ''; confirmPassword.value = ''
    toast.success('Password changed')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Could not change password')
  } finally {
    savingPw.value = false
  }
}
const inp = 'w-full rounded-md border border-line bg-card px-3 py-2 text-sm'
</script>

<template>
  <div class="max-w-xl space-y-8">
    <section>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">Profile</h2>
      <div class="space-y-4 rounded-lg border border-line bg-surface p-5 shadow-card">
        <div class="flex items-center gap-4">
          <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-lg font-semibold text-accent">
            <img v-if="avatar" :src="avatar" alt="Avatar" class="h-full w-full object-cover">
            <span v-else>{{ initials }}</span>
          </div>
          <div class="flex gap-2">
            <button class="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-line-strong" @click="fileInput?.click()">Upload</button>
            <button v-if="avatar" class="rounded-md px-3 py-1.5 text-sm text-muted hover:text-red-600" @click="removeAvatar">Remove</button>
            <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onPickFile">
          </div>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Name</label>
          <input v-model="name" :class="inp">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Email</label>
          <input :value="account?.email" disabled :class="`${inp} cursor-not-allowed text-muted`">
          <p class="mt-1 text-xs text-faint">Email can't be changed here — contact your workspace admin.</p>
        </div>
        <div class="flex justify-end">
          <button :disabled="savingProfile" class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px disabled:opacity-60" @click="saveProfile">Save profile</button>
        </div>
      </div>
    </section>

    <section>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">Change password</h2>
      <div class="space-y-3 rounded-lg border border-line bg-surface p-5 shadow-card">
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Current password</label>
          <input v-model="currentPassword" type="password" :class="inp">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">New password</label>
          <input v-model="newPassword" type="password" placeholder="Min 8 characters" :class="inp">
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Confirm new password</label>
          <input v-model="confirmPassword" type="password" :class="inp" @keyup.enter="savePassword">
        </div>
        <div class="flex justify-end">
          <button :disabled="savingPw" class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px disabled:opacity-60" @click="savePassword">Update password</button>
        </div>
      </div>
    </section>
  </div>
</template>
