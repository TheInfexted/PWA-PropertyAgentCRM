# Static App Shell + Account/Profile Management Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Fix the layout so the sidebar + topbar stay pinned and only the content scrolls; (2) add an Account page where any logged-in user can edit their display name, change their password, and upload a profile picture — with email shown read-only (admin-only by design).

**Architecture:** Convert `default.vue` into a fixed-height app shell (`h-dvh` + a single scrolling `<main>`). Add a `users.avatar` column (`mediumtext`) storing a small, client-resized base64 data URL — no filesystem/serving infra, survives deploys. Avatar is NOT placed in the session cookie (size limit); it's fetched via `/api/account` through a `useState`-cached `useAccount` composable shared by the page and the sidebar. Password change verifies the current password with the same `verifyPassword`/`hashPassword` used at login.

**Tech Stack:** Nuxt 4, Tailwind v4, Drizzle + MySQL (`mediumtext`), `nuxt-auth-utils` (`hashPassword`/`verifyPassword`/`setUserSession`), Vitest. Reuses `requireContext`, `buildSessionPayload`, `useToast`.

**Plan:** Plan 9. Branch: `feat/account`. Spec: builds on `docs/superpowers/specs/2026-05-21-property-crm-core-design.md` (§4.3 screen 7 / §6.3 auth).

**Conventions (all tasks):**
- Run from project root. Tests `*.spec.ts`. Single: `pnpm vitest run <path>`. All: `pnpm test:run`. Keep `pnpm exec nuxi typecheck` at 0.
- Commit per task; `git add` only named files (no `-A`). Aliases `~~/` root, `~/` app. Follow `DESIGN.md` (terracotta accent, warm neutrals, WCAG AA).
- **Deploy note:** this plan adds a DB migration (`users.avatar`), so the next deploy MUST run `pnpm db:migrate`.

---

## Task 1: DB column + migration + account schemas (TDD) + repo + endpoints

**Files:**
- Modify: `server/db/schema.ts`
- Generate: `server/db/migrations/0002_*.sql` (+ meta) via `pnpm db:generate`
- Create: `shared/schemas/account.ts`, `shared/schemas/account.spec.ts`
- Create: `server/utils/account.repo.ts`, `server/api/account/index.get.ts`, `server/api/account/index.patch.ts`, `server/api/account/password.post.ts`

- [ ] **Step 1: Add the `avatar` column to `server/db/schema.ts`**

Add `mediumtext` to the drizzle import (it currently imports `mysqlTable, int, varchar, text, boolean, timestamp, mysqlEnum, json, uniqueIndex, index`):
```ts
import {
  mysqlTable, int, varchar, text, mediumtext, boolean, timestamp,
  mysqlEnum, json, uniqueIndex, index,
} from 'drizzle-orm/mysql-core'
```
Then add the `avatar` field to the `users` table (after `name`):
```ts
export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 120 }).notNull().default(''),
  avatar: mediumtext('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate` (drizzle-kit diffs the schema; no DB connection needed). Confirm a new `server/db/migrations/0002_*.sql` is created containing `ALTER TABLE \`users\` ADD \`avatar\` mediumtext;` and that `meta/_journal.json` + a new snapshot were updated.

- [ ] **Step 3: Write failing account-schema tests** — create `shared/schemas/account.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { accountUpdateSchema, passwordChangeSchema } from './account'

describe('accountUpdateSchema', () => {
  const img = 'data:image/png;base64,iVBORw0KGgo='
  it('accepts a name-only update', () => {
    expect(accountUpdateSchema.safeParse({ name: 'Sam' }).success).toBe(true)
  })
  it('accepts an avatar data URL and a null (clear)', () => {
    expect(accountUpdateSchema.safeParse({ avatar: img }).success).toBe(true)
    expect(accountUpdateSchema.safeParse({ avatar: null }).success).toBe(true)
  })
  it('rejects a non-image avatar string', () => {
    expect(accountUpdateSchema.safeParse({ avatar: 'data:text/plain;base64,xx' }).success).toBe(false)
  })
  it('rejects an empty patch and a blank name', () => {
    expect(accountUpdateSchema.safeParse({}).success).toBe(false)
    expect(accountUpdateSchema.safeParse({ name: '  ' }).success).toBe(false)
  })
})

describe('passwordChangeSchema', () => {
  it('requires an 8+ char new password', () => {
    expect(passwordChangeSchema.safeParse({ currentPassword: 'x', newPassword: 'hunter22' }).success).toBe(true)
    expect(passwordChangeSchema.safeParse({ currentPassword: 'x', newPassword: 'short' }).success).toBe(false)
  })
})
```

- [ ] **Step 4: Run — expect FAIL** (`./account` unresolved).

Run: `pnpm vitest run shared/schemas/account.spec.ts`

- [ ] **Step 5: Implement `shared/schemas/account.ts`:**
```ts
import { z } from 'zod'

const avatarData = z
  .string()
  .regex(/^data:image\/(png|jpe?g|webp);base64,/, 'Must be a PNG, JPEG or WebP image')
  .max(2_000_000)

export const accountUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    avatar: avatarData.nullable().optional(), // null clears the avatar
  })
  .refine((d) => d.name !== undefined || d.avatar !== undefined, { message: 'Nothing to update' })

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
})

export type AccountUpdate = z.infer<typeof accountUpdateSchema>
```

- [ ] **Step 6: Run — expect PASS.**

Run: `pnpm vitest run shared/schemas/account.spec.ts`

- [ ] **Step 7: Create `server/utils/account.repo.ts`:**
```ts
import { eq } from 'drizzle-orm'
import { users } from '~~/server/db/schema'

export async function getAccount(userId: number) {
  const db = useDb()
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, avatar: users.avatar })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row ?? null
}

export async function updateAccount(userId: number, patch: { name?: string; avatar?: string | null }) {
  const db = useDb()
  const set: Partial<typeof users.$inferInsert> = {}
  if (patch.name !== undefined) set.name = patch.name
  if (patch.avatar !== undefined) set.avatar = patch.avatar
  if (Object.keys(set).length) {
    await db.update(users).set(set).where(eq(users.id, userId))
  }
  return getAccount(userId)
}

/** Verifies the current password, then sets the new one. Returns false if the current password is wrong. */
export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
  const db = useDb()
  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1)
  if (!row) return false
  if (!(await verifyPassword(row.passwordHash, currentPassword))) return false
  const passwordHash = await hashPassword(newPassword)
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId))
  return true
}
```
(`useDb`, `verifyPassword`, `hashPassword`, `createError` are Nitro auto-imports.)

- [ ] **Step 8: Create the three endpoints**

`server/api/account/index.get.ts`:
```ts
import { getAccount } from '~~/server/utils/account.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const account = await getAccount(ctx.userId)
  if (!account) throw createError({ statusCode: 404, message: 'Account not found' })
  return { ...account, role: ctx.role }
})
```

`server/api/account/index.patch.ts`:
```ts
import { accountUpdateSchema } from '~~/shared/schemas/account'
import { updateAccount } from '~~/server/utils/account.repo'
import { buildSessionPayload } from '~~/server/utils/session-payload'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const patch = accountUpdateSchema.parse(await readBody(event))
  const account = await updateAccount(ctx.userId, patch)
  if (!account) throw createError({ statusCode: 404, message: 'Account not found' })
  // Re-issue the session so a renamed user shows immediately. Avatar is NOT stored in the
  // cookie (size) — the client fetches it via GET /api/account.
  if (patch.name !== undefined) {
    await setUserSession(event, {
      ...buildSessionPayload(
        { id: account.id, email: account.email, name: account.name },
        { workspaceId: ctx.workspaceId, role: ctx.role },
      ),
    })
  }
  return { ...account, role: ctx.role }
})
```

`server/api/account/password.post.ts`:
```ts
import { passwordChangeSchema } from '~~/shared/schemas/account'
import { changePassword } from '~~/server/utils/account.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const { currentPassword, newPassword } = passwordChangeSchema.parse(await readBody(event))
  const ok = await changePassword(ctx.userId, currentPassword, newPassword)
  if (!ok) throw createError({ statusCode: 400, message: 'Current password is incorrect' })
  return { ok: true }
})
```

- [ ] **Step 9: Typecheck + full tests + commit**

Run: `pnpm exec nuxi typecheck && pnpm test:run` (0 errors; all specs pass incl. the new ones).
```bash
git add server/db/schema.ts server/db/migrations shared/schemas/account.ts shared/schemas/account.spec.ts server/utils/account.repo.ts server/api/account/index.get.ts server/api/account/index.patch.ts server/api/account/password.post.ts
git commit -m "feat(account): users.avatar column + account schemas, repo, endpoints (name/password/avatar)"
```

---

## Task 2: useAccount composable + image-resize util + Account page

**Files:**
- Create: `app/composables/useAccount.ts`, `app/utils/image.ts`, `app/pages/account.vue`

- [ ] **Step 1: Create `app/composables/useAccount.ts`:**
```ts
export interface Account {
  id: number
  name: string
  email: string
  role: 'owner' | 'agent'
  avatar: string | null
}

export function useAccount() {
  const request = useRequestFetch()
  const account = useState<Account | null>('account', () => null)

  async function load(force = false) {
    if (account.value && !force) return account.value
    account.value = await request<Account>('/api/account')
    return account.value
  }
  async function updateProfile(patch: { name?: string; avatar?: string | null }) {
    account.value = await request<Account>('/api/account', { method: 'PATCH', body: patch })
    return account.value
  }
  async function changePassword(currentPassword: string, newPassword: string) {
    return request('/api/account/password', { method: 'POST', body: { currentPassword, newPassword } })
  }
  return { account, load, updateProfile, changePassword }
}
```

- [ ] **Step 2: Create `app/utils/image.ts`** (client-only canvas resize):
```ts
/** Resize an image File to a max dimension and return a compressed JPEG data URL. Browser-only. */
export function fileToResizedDataUrl(file: File, maxDim = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not load the image'))
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const cx = canvas.getContext('2d')
        if (!cx) return reject(new Error('Canvas not supported'))
        cx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
```

- [ ] **Step 3: Create `app/pages/account.vue`:**
```vue
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
```

- [ ] **Step 4: Typecheck + tests + build + commit**

Run: `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; tests pass; build completes).
```bash
git add app/composables/useAccount.ts app/utils/image.ts app/pages/account.vue
git commit -m "feat(account): useAccount composable, image resize util, account page (profile + password)"
```

---

## Task 3: Static app-shell layout fix + user-menu Account link + sidebar avatar

**Files:**
- Modify: `app/layouts/default.vue`

- [ ] **Step 1: Pin the shell (sidebar + topbar static, only content scrolls)**

In `app/layouts/default.vue`:
(a) Outer wrapper: change `class="flex min-h-dvh bg-canvas text-ink"` → `class="flex h-dvh overflow-hidden bg-canvas text-ink"`.
(b) `<aside …>`: add `h-dvh` to its class list (e.g. `class="flex h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface p-4"`).
(c) `<nav class="flex-1 space-y-0.5 text-sm">` → add `overflow-y-auto`: `class="flex-1 space-y-0.5 overflow-y-auto text-sm"`.
(d) `<main class="p-8">` → `class="flex-1 overflow-y-auto p-8"`.
(Leave the main column div and the `h-14 shrink-0` header as-is — the header stays pinned because `<main>` now owns the scroll.)

- [ ] **Step 2: Add the Account title + load the avatar**

(a) Add `'/account': 'Account'` to the `titles` map.
(b) In `<script setup>`, after the existing `const isOwner = …` line, add:
```ts
const { account, load: loadAccount } = useAccount()
onMounted(() => { loadAccount() })
const avatarUrl = computed(() => account.value?.avatar ?? null)
```

- [ ] **Step 3: Show the avatar in the user-menu button + add an Account link**

(a) Replace the initials `<span>` inside the user-menu `<button>`:
```vue
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{{ initials }}</span>
```
with:
```vue
          <span class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-xs font-semibold text-accent">
            <img v-if="avatarUrl" :src="avatarUrl" alt="" class="h-full w-full object-cover">
            <template v-else>{{ initials }}</template>
          </span>
```
(b) In the dropdown menu, add an Account link ABOVE the Log out button (inside the same `<div class="absolute bottom-full …">`, before the `<button … @click="logout">`):
```vue
            <NuxtLink
              to="/account"
              class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted transition-colors hover:bg-canvas hover:text-ink"
              @click="menuOpen = false"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Account
            </NuxtLink>
```

- [ ] **Step 4: Typecheck + build + commit**

Run: `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; tests pass; build completes).
```bash
git add app/layouts/default.vue
git commit -m "feat(ui): pinned app shell (static sidebar/topbar), account link + avatar in user menu"
```

---

## Task 4: Full verification + smoke

**Files:** none.

- [ ] **Step 1:** `pnpm test:run` — all specs pass (incl. `account.spec.ts`).
- [ ] **Step 2:** `pnpm exec nuxi typecheck && pnpm build` — 0 errors; build completes.
- [ ] **Step 3: Manual smoke (dev + MySQL — after running `pnpm db:migrate` so the `avatar` column exists):**
  1. Open **Settings** (a long page) and scroll — the sidebar + topbar stay fixed; only the content scrolls. The sidebar no longer extends past the viewport.
  2. User menu (bottom-left) → **Account**.
  3. Change your **name** → Save profile → toast "Profile updated"; the sidebar name updates immediately.
  4. **Upload** a profile picture → it previews; Save profile → the avatar appears in the sidebar user-menu button. **Remove** → Save → back to initials.
  5. **Email** field is disabled with the admin note.
  6. **Change password:** wrong current password → toast "Current password is incorrect"; mismatched confirm → "Passwords do not match"; correct → "Password changed", and re-login with the new password works.
  7. An **agent** account can reach `/account` and manage their own profile/password too.

- [ ] **Step 4: Merge to master**
```bash
git checkout master && git merge --ff-only feat/account && git branch -d feat/account
```

---

## Deferred (not in this plan)
- Mobile/responsive collapsing of the sidebar (Phase-1 is a desktop dashboard; the PWA installs but a hamburger/drawer nav is a separate pass).
- Owner managing *other* members' profiles/avatars (this plan is self-service only; email/role/removal stay admin/DB).

## Done criteria
- `pnpm test:run` green, typecheck 0, build succeeds.
- Sidebar + topbar are pinned; only content scrolls. Any user can edit their name, upload/remove an avatar, and change their password; email is read-only. Deploy applies migration `0002` (`users.avatar`).
