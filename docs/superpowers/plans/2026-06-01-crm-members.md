# Members & Invites (Team) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an Owner invite agents via a shareable link, have agents accept (creating their account), assign leads to agents, and see the team — exercising the existing "owner sees all / agent sees own" rule end to end.

**Architecture:** Reuses the `invites` table, `workspace_members`, roles, `buildSessionPayload`, and the visibility guard (all from Plan 1). Owner-only invite/member endpoints (guarded by `requireOwner`). A public accept flow (token link → set name/password → creates user + membership + session) that needs NO email server. Lead assignment uses the existing owner-only `assignedTo` path.

**Tech Stack:** Nuxt 4 (Vue 3 + TS), Tailwind v4, Drizzle + MySQL, `nuxt-auth-utils`, Vitest. Reuses `requireContext`/`requireOwner`, `hashPassword`/`setUserSession`, `useLeads`, the warm `DESIGN.md`.

**Plan:** Plan 5 of the Phase-1 sequence. Spec: `docs/superpowers/specs/2026-05-21-property-crm-core-design.md` (§3 onboarding, §4.3 screen 6). Builds on Plans 1-4.

**Conventions (all tasks):**
- Run from project root `/Users/brendxn___/Desktop/PWA-PropertyAgentCRM`.
- Tests `*.spec.ts` next to code. Single: `pnpm vitest run <path>`. All: `pnpm test:run`. Keep `pnpm exec nuxi typecheck` at 0.
- Commit per task; `git add` only named files (no `-A`). Aliases `~~/` root, `~/` app. Follow `DESIGN.md`.

---

## Task 1: Invite schemas + link helper (TDD)

**Files:**
- Create: `shared/schemas/invite.ts`
- Test: `shared/schemas/invite.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/schemas/invite.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createInviteSchema, acceptInviteSchema, inviteLink } from './invite'

describe('createInviteSchema', () => {
  it('accepts an email and defaults role to agent', () => {
    const r = createInviteSchema.safeParse({ email: 'sam@kirana.my' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.role).toBe('agent')
  })
  it('rejects a bad email', () => {
    expect(createInviteSchema.safeParse({ email: 'nope' }).success).toBe(false)
  })
})

describe('acceptInviteSchema', () => {
  it('requires token, name and an 8+ char password', () => {
    expect(acceptInviteSchema.safeParse({ token: 'abcdef1234', name: 'Sam', password: 'hunter22' }).success).toBe(true)
    expect(acceptInviteSchema.safeParse({ token: 'abcdef1234', name: 'Sam', password: 'short' }).success).toBe(false)
  })
})

describe('inviteLink', () => {
  it('builds the accept URL from an origin and token', () => {
    expect(inviteLink('https://crm-demo.ninedsales.com', 'tok123')).toBe('https://crm-demo.ninedsales.com/invite/tok123')
  })
  it('trims a trailing slash on the origin', () => {
    expect(inviteLink('https://x.com/', 'tok')).toBe('https://x.com/invite/tok')
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pnpm vitest run shared/schemas/invite.spec.ts`
Expected: FAIL — cannot resolve `./invite`.

- [ ] **Step 3: Implement**

Create `shared/schemas/invite.ts`:
```ts
import { z } from 'zod'

export const createInviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.literal('agent').default('agent'),
})

export const acceptInviteSchema = z.object({
  token: z.string().min(10).max(128),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(200),
})

export type CreateInvite = z.infer<typeof createInviteSchema>

/** Build the public accept URL for an invite token. */
export function inviteLink(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/invite/${token}`
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm vitest run shared/schemas/invite.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/schemas/invite.ts shared/schemas/invite.spec.ts
git commit -m "feat(team): invite schemas + accept-link helper"
```

---

## Task 2: Invites + members repositories

**Files:**
- Create: `server/utils/invites.repo.ts`, `server/utils/members.repo.ts`

> DB-backed; verified by typecheck + smoke. Owner-only enforced at the endpoints (Task 3). All workspace-scoped. `hashPassword`/`createError` are Nitro auto-imports available in `server/utils`.

- [ ] **Step 1: Create `server/utils/invites.repo.ts`**

```ts
import { randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { invites, users, workspaceMembers, workspaces } from '~~/server/db/schema'
import { buildSessionPayload, type SessionPayload } from './session-payload'
import type { RequestContext } from './context'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function createInvite(ctx: RequestContext, email: string) {
  const db = useDb()
  const token = randomBytes(24).toString('hex')
  await db.insert(invites).values({
    workspaceId: ctx.workspaceId,
    email,
    role: 'agent',
    token,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  })
  return { token, email }
}

export async function listPendingInvites(ctx: RequestContext) {
  const db = useDb()
  return db
    .select({ id: invites.id, email: invites.email, role: invites.role, createdAt: invites.createdAt })
    .from(invites)
    .where(and(eq(invites.workspaceId, ctx.workspaceId), isNull(invites.acceptedAt), gt(invites.expiresAt, new Date())))
}

export async function revokeInvite(ctx: RequestContext, id: number) {
  const db = useDb()
  await db.delete(invites)
    .where(and(eq(invites.workspaceId, ctx.workspaceId), eq(invites.id, id), isNull(invites.acceptedAt)))
}

export async function getInviteByToken(token: string) {
  const db = useDb()
  const [row] = await db
    .select({ id: invites.id, email: invites.email, role: invites.role, workspaceId: invites.workspaceId, workspaceName: workspaces.name })
    .from(invites)
    .innerJoin(workspaces, eq(workspaces.id, invites.workspaceId))
    .where(and(eq(invites.token, token), isNull(invites.acceptedAt), gt(invites.expiresAt, new Date())))
    .limit(1)
  return row ?? null
}

export async function acceptInvite(token: string, name: string, password: string): Promise<SessionPayload | null> {
  const db = useDb()
  const invite = await getInviteByToken(token)
  if (!invite) return null

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, invite.email)).limit(1)
  if (existing) throw createError({ statusCode: 409, message: 'An account already exists for this email' })

  const passwordHash = await hashPassword(password)
  const [u] = await db.insert(users).values({ email: invite.email, passwordHash, name })
  const userId = u.insertId

  await db.insert(workspaceMembers).values({ workspaceId: invite.workspaceId, userId, role: invite.role })
  await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id))

  return buildSessionPayload(
    { id: userId, email: invite.email, name },
    { workspaceId: invite.workspaceId, role: invite.role },
  )
}
```

- [ ] **Step 2: Create `server/utils/members.repo.ts`**

```ts
import { eq } from 'drizzle-orm'
import { workspaceMembers, users } from '~~/server/db/schema'
import type { RequestContext } from './context'

export async function listMembers(ctx: RequestContext) {
  const db = useDb()
  return db
    .select({ userId: users.id, name: users.name, email: users.email, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, ctx.workspaceId))
}
```

- [ ] **Step 3: Type-check + commit**

Run: `pnpm exec nuxi typecheck` (0 errors).
```bash
git add server/utils/invites.repo.ts server/utils/members.repo.ts
git commit -m "feat(team): invites + members repositories"
```

---

## Task 3: Invite + member endpoints

**Files:**
- Create: `server/api/invites/index.post.ts`, `server/api/invites/index.get.ts`, `server/api/invites/[id].delete.ts`, `server/api/invites/accept.get.ts`, `server/api/invites/accept.post.ts`, `server/api/members/index.get.ts`

- [ ] **Step 1: Owner-only invite management**

`server/api/invites/index.post.ts`:
```ts
import { createInviteSchema } from '~~/shared/schemas/invite'
import { createInvite } from '~~/server/utils/invites.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const { email } = createInviteSchema.parse(await readBody(event))
  return createInvite(ctx, email)
})
```

`server/api/invites/index.get.ts`:
```ts
import { listPendingInvites } from '~~/server/utils/invites.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  return listPendingInvites(ctx)
})
```

`server/api/invites/[id].delete.ts`:
```ts
import { revokeInvite } from '~~/server/utils/invites.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  await revokeInvite(ctx, id)
  return { ok: true }
})
```

- [ ] **Step 2: Public accept endpoints (no auth)**

`server/api/invites/accept.get.ts`:
```ts
import { getInviteByToken } from '~~/server/utils/invites.repo'

export default defineEventHandler(async (event) => {
  const token = String(getQuery(event).token ?? '')
  const invite = await getInviteByToken(token)
  if (!invite) throw createError({ statusCode: 404, message: 'This invite is invalid or has expired' })
  return { email: invite.email, workspaceName: invite.workspaceName }
})
```

`server/api/invites/accept.post.ts`:
```ts
import { acceptInviteSchema } from '~~/shared/schemas/invite'
import { acceptInvite } from '~~/server/utils/invites.repo'

export default defineEventHandler(async (event) => {
  const { token, name, password } = acceptInviteSchema.parse(await readBody(event))
  const session = await acceptInvite(token, name, password)
  if (!session) throw createError({ statusCode: 400, message: 'This invite is invalid or has expired' })
  await setUserSession(event, session)
  return { ok: true }
})
```
(`accept.get.ts` / `accept.post.ts` are static, so they win over `[id].*` for `/api/invites/accept`. These two do NOT call `requireContext` — they are public.)

- [ ] **Step 3: Members list (owner)**

`server/api/members/index.get.ts`:
```ts
import { listMembers } from '~~/server/utils/members.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  return listMembers(ctx)
})
```

- [ ] **Step 4: Type-check + commit**

Run: `pnpm exec nuxi typecheck` (0 errors).
```bash
git add server/api/invites/index.post.ts server/api/invites/index.get.ts server/api/invites/[id].delete.ts server/api/invites/accept.get.ts server/api/invites/accept.post.ts server/api/members/index.get.ts
git commit -m "feat(team): invite management + public accept + members endpoints"
```

---

## Task 4: Public accept page + middleware

**Files:**
- Modify: `app/middleware/auth.global.ts`
- Create: `app/pages/invite/[token].vue`

- [ ] **Step 1: Allow `/invite/*` through the auth middleware**

In `app/middleware/auth.global.ts`, the current logic uses `const publicRoutes = ['/login', '/setup']` and checks `publicRoutes.includes(to.path)`. Change both `includes` checks to also treat any `/invite/...` path as public. Concretely, add this helper right after `publicRoutes` is declared:
```ts
  const isPublic = (path: string) => publicRoutes.includes(path) || path.startsWith('/invite/')
```
Then replace the two `publicRoutes.includes(to.path)` usages with `isPublic(to.path)`. (Leave the `needsSetup` redirect logic unchanged.)

- [ ] **Step 2: Create `app/pages/invite/[token].vue`**

```vue
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
```

- [ ] **Step 3: Type-check + build + commit**

Run: `pnpm exec nuxi typecheck && pnpm build` (0 errors; build completes).
```bash
git add app/middleware/auth.global.ts app/pages/invite/[token].vue
git commit -m "feat(team): public invite accept page + middleware allowance"
```

---

## Task 5: Team page + composable + nav

**Files:**
- Create: `app/composables/useTeam.ts`, `app/pages/members.vue`
- Modify: `app/layouts/default.vue`

> Owner-only (nav hidden for agents; endpoints already 403). Follow `DESIGN.md`.

- [ ] **Step 1: Composable**

Create `app/composables/useTeam.ts`:
```ts
import { inviteLink } from '~~/shared/schemas/invite'

export interface Member { userId: number; name: string; email: string; role: 'owner' | 'agent' }
export interface PendingInvite { id: number; email: string; role: string; createdAt: string }

export function useTeam() {
  const request = useRequestFetch()
  return {
    listMembers: () => request<Member[]>('/api/members'),
    listInvites: () => request<PendingInvite[]>('/api/invites'),
    createInvite: (email: string) => request<{ token: string; email: string }>('/api/invites', { method: 'POST', body: { email } }),
    revokeInvite: (id: number) => request(`/api/invites/${id}`, { method: 'DELETE' }),
    linkFor: (token: string) => inviteLink(window.location.origin, token),
  }
}
```

- [ ] **Step 2: Team page**

Create `app/pages/members.vue`:
```vue
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
```

- [ ] **Step 3: Owner-only nav link + title**

In `app/layouts/default.vue`:
(a) Add `'/members': 'Team'` to the `titles` map.
(b) Inside `<nav>`, after the Settings link (`v-if="isOwner"`), add this link (also owner-only — reuse the existing `isOwner`):
```vue
        <NuxtLink
          v-if="isOwner"
          to="/members"
          class="flex items-center gap-2.5 rounded-md px-3 py-2 text-muted transition-colors hover:bg-canvas hover:text-ink"
          active-class="bg-accent-soft text-accent font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Team
        </NuxtLink>
```

- [ ] **Step 4: Type-check + build + commit**

Run: `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; tests pass; build completes).
```bash
git add app/composables/useTeam.ts app/pages/members.vue app/layouts/default.vue
git commit -m "feat(team): members/invites page, useTeam composable, owner-only nav"
```

---

## Task 6: Assign leads to agents (owner)

**Files:**
- Modify: `app/components/LeadDetailPanel.vue`

> Adds an owner-only "Assigned to" control. Reuses the existing PATCH path (which already rejects agent reassignment with 403 and honors owner reassignment).

- [ ] **Step 1: Add assignment to `app/components/LeadDetailPanel.vue`**

In the `<script setup>`, add (alongside the existing follow-up logic): read the session role and the members (only fetch members if owner), and an assign handler:
```ts
const { session } = useUserSession()
const isOwner = computed(() => (session.value as { role?: string } | null)?.role === 'owner')
const { data: members } = useFetch('/api/members', { lazy: true, immediate: isOwner.value, default: () => [] })

async function assign(userId: number) {
  await update(props.leadId, { assignedTo: userId })
  await refresh()
  emit('changed')
}
```
(`update`, `refresh`, `emit`, `props` already exist in this component from Plan 3. Reuse them.)

Then add this block in the template, right after the follow-up `<div>` and before the Activity `<h3>`:
```vue
    <div v-if="isOwner && (members ?? []).length > 1" class="mt-4 rounded-lg border border-line bg-canvas/50 p-3">
      <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint">Assigned to</label>
      <select
        class="w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm"
        :value="lead?.assignedTo ?? ''"
        @change="assign(Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="m in members ?? []" :key="m.userId" :value="m.userId">{{ m.name }} ({{ m.role }})</option>
      </select>
    </div>
```

- [ ] **Step 2: Type-check + build + commit**

Run: `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; tests pass; build completes).
```bash
git add app/components/LeadDetailPanel.vue
git commit -m "feat(team): owner can reassign a lead to a member from the detail panel"
```

---

## Task 7: Full verification + smoke

**Files:** none.

- [ ] **Step 1:** `pnpm test:run` — all specs pass (incl. `invite.spec.ts`, 5).
- [ ] **Step 2:** `pnpm exec nuxi typecheck && pnpm build` — 0 errors; build completes.
- [ ] **Step 3: Manual smoke (dev + MySQL):**
  1. As the **Owner**, open **Team** → enter an email → **Create link** → copy the link.
  2. Open the link in a private/incognito window → the accept page shows the workspace + email → set a name + password → **Join workspace** → lands on the leads list as the new **agent** (no Settings/Team nav for them).
  3. Back as Owner: open a lead → **Assigned to** → pick the agent → save.
  4. In the agent's window, reload the leads list → that lead is visible to the agent; other unassigned leads are NOT (own-only visibility).
  5. As the agent, confirm they cannot reach `/settings` or `/members` mutations (Settings/Team links are hidden; direct API calls 403).
  6. Owner → Team → **Revoke** a still-pending invite removes it.

Expected: all steps behave as described.

- [ ] **Step 4: Commit (only if smoke fixes needed)** — `git add -A && git commit -m "test(team): smoke fixes"`.

---

## Deferred (not in this plan)

- Removing a member / changing a member's role (and reassigning their leads on removal).
- Email delivery of invites (needs SMTP; the shareable link covers day one).
- A members filter on the Leads table ("show me agent X's leads") for the owner.

## Done criteria

- `pnpm test:run` green (incl. `invite.spec.ts`), typecheck 0, build succeeds.
- An Owner invites an agent by link, the agent accepts and gets an agent account, the Owner assigns leads, and the agent sees only their assigned leads while the Owner sees all. Settings/Team are owner-only; agent mutations are rejected (403).
