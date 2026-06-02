# Phase-1 Polish Plan (member management, responsive sidebar, settings toasts)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Checkbox (`- [ ]`) steps. The orchestrator self-reviews each task's diff + runs typecheck/tests before continuing.

**Goal:** Close the deferred Phase-1 edges: owner member management (remove, role change, agent password reset), a responsive (drawer) sidebar for the installed PWA on phones, and toast feedback across Settings.

**Decisions (from the user):** Removing a member **reassigns their leads to the acting owner**; an owner resets an agent's password by **typing a new one** (shown to share); role changes are **promote/demote with a last-owner guard** (never zero owners). All member-management endpoints are **owner-only**.

**Tech Stack:** Nuxt 4, Drizzle + MySQL, `nuxt-auth-utils` (`hashPassword`), Vitest. Branch: `feat/polish`. No DB migration in this plan.

**Conventions:** Run from project root. Tests `*.spec.ts`. `pnpm vitest run <path>` / `pnpm test:run` / `pnpm exec nuxi typecheck` (keep 0). Commit per task, `git add` only named files. Aliases `~~/` root, `~/` app. Follow `DESIGN.md`.

---

## Task 1 — Member-management server: schemas (TDD) + repo + endpoints

**Files:** Create `shared/schemas/member.ts` (+ `.spec.ts`), `server/api/members/[id].patch.ts`, `server/api/members/[id].delete.ts`, `server/api/members/[id]/password.post.ts`. Modify `server/utils/members.repo.ts`.

- [ ] **Step 1: Failing schema tests** — `shared/schemas/member.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { memberRoleSchema, memberPasswordSchema } from './member'

describe('memberRoleSchema', () => {
  it('accepts owner/agent', () => {
    expect(memberRoleSchema.safeParse({ role: 'owner' }).success).toBe(true)
    expect(memberRoleSchema.safeParse({ role: 'agent' }).success).toBe(true)
  })
  it('rejects an unknown role', () => {
    expect(memberRoleSchema.safeParse({ role: 'admin' }).success).toBe(false)
  })
})

describe('memberPasswordSchema', () => {
  it('requires an 8+ char password', () => {
    expect(memberPasswordSchema.safeParse({ newPassword: 'hunter22' }).success).toBe(true)
    expect(memberPasswordSchema.safeParse({ newPassword: 'short' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect FAIL.** `pnpm vitest run shared/schemas/member.spec.ts`

- [ ] **Step 3: Implement `shared/schemas/member.ts`:**
```ts
import { z } from 'zod'

export const memberRoleSchema = z.object({ role: z.enum(['owner', 'agent']) })
export const memberPasswordSchema = z.object({ newPassword: z.string().min(8).max(200) })

export type MemberRole = z.infer<typeof memberRoleSchema>
```

- [ ] **Step 4: Run — expect PASS.** `pnpm vitest run shared/schemas/member.spec.ts`

- [ ] **Step 5: Add repo functions to `server/utils/members.repo.ts`.** Replace the import line with `import { and, eq, sql } from 'drizzle-orm'` and `import { workspaceMembers, users, leads } from '~~/server/db/schema'`, keep `listMembers`, and append:
```ts
async function ownerCount(ctx: RequestContext): Promise<number> {
  const db = useDb()
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ctx.workspaceId), eq(workspaceMembers.role, 'owner')))
  return Number(r?.n ?? 0)
}

async function getMembership(ctx: RequestContext, userId: number) {
  const db = useDb()
  const [m] = await db.select().from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ctx.workspaceId), eq(workspaceMembers.userId, userId))).limit(1)
  return m ?? null
}

export async function changeMemberRole(ctx: RequestContext, userId: number, role: 'owner' | 'agent') {
  const db = useDb()
  const m = await getMembership(ctx, userId)
  if (!m) throw createError({ statusCode: 404, message: 'Member not found' })
  if (m.role === 'owner' && role === 'agent' && (await ownerCount(ctx)) <= 1) {
    throw createError({ statusCode: 400, message: 'The workspace must keep at least one owner' })
  }
  await db.update(workspaceMembers).set({ role })
    .where(and(eq(workspaceMembers.workspaceId, ctx.workspaceId), eq(workspaceMembers.userId, userId)))
}

/** Reassign the member's leads to the acting owner, then remove their membership (transactional). */
export async function removeMember(ctx: RequestContext, userId: number) {
  if (userId === ctx.userId) throw createError({ statusCode: 400, message: "You can't remove yourself" })
  const m = await getMembership(ctx, userId)
  if (!m) throw createError({ statusCode: 404, message: 'Member not found' })
  if (m.role === 'owner' && (await ownerCount(ctx)) <= 1) {
    throw createError({ statusCode: 400, message: 'The workspace must keep at least one owner' })
  }
  const db = useDb()
  await db.transaction(async (tx) => {
    await tx.update(leads).set({ assignedTo: ctx.userId })
      .where(and(eq(leads.workspaceId, ctx.workspaceId), eq(leads.assignedTo, userId)))
    await tx.delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, ctx.workspaceId), eq(workspaceMembers.userId, userId)))
  })
}

export async function setMemberPassword(ctx: RequestContext, userId: number, newPassword: string) {
  const m = await getMembership(ctx, userId)
  if (!m) throw createError({ statusCode: 404, message: 'Member not found' })
  const passwordHash = await hashPassword(newPassword)
  const db = useDb()
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId))
}
```
(`useDb`, `createError`, `hashPassword` are Nitro auto-imports.)

- [ ] **Step 6: Create the three endpoints.**

`server/api/members/[id].patch.ts`:
```ts
import { memberRoleSchema } from '~~/shared/schemas/member'
import { changeMemberRole } from '~~/server/utils/members.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const userId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(userId) || userId <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  const { role } = memberRoleSchema.parse(await readBody(event))
  await changeMemberRole(ctx, userId, role)
  return { ok: true }
})
```

`server/api/members/[id].delete.ts`:
```ts
import { removeMember } from '~~/server/utils/members.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const userId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(userId) || userId <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  await removeMember(ctx, userId)
  return { ok: true }
})
```

`server/api/members/[id]/password.post.ts`:
```ts
import { memberPasswordSchema } from '~~/shared/schemas/member'
import { setMemberPassword } from '~~/server/utils/members.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  requireOwner(ctx)
  const userId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(userId) || userId <= 0) throw createError({ statusCode: 400, message: 'Invalid id' })
  const { newPassword } = memberPasswordSchema.parse(await readBody(event))
  await setMemberPassword(ctx, userId, newPassword)
  return { ok: true }
})
```

- [ ] **Step 7: Typecheck + tests + commit.** `pnpm exec nuxi typecheck && pnpm test:run` (0; pass).
```bash
git add shared/schemas/member.ts shared/schemas/member.spec.ts server/utils/members.repo.ts "server/api/members/[id].patch.ts" "server/api/members/[id].delete.ts" "server/api/members/[id]/password.post.ts"
git commit -m "feat(team): owner member management — change role (last-owner guard), remove (reassign leads), reset password"
```

---

## Task 2 — Team page UI + useTeam methods

**Files:** Modify `app/composables/useTeam.ts`, `app/pages/members.vue`.

- [ ] **Step 1: Add methods to `app/composables/useTeam.ts`** — inside the returned object (after `revokeInvite`):
```ts
    changeRole: (userId: number, role: 'owner' | 'agent') => request(`/api/members/${userId}`, { method: 'PATCH', body: { role } }),
    removeMember: (userId: number) => request(`/api/members/${userId}`, { method: 'DELETE' }),
    resetPassword: (userId: number, newPassword: string) => request(`/api/members/${userId}/password`, { method: 'POST', body: { newPassword } }),
```

- [ ] **Step 2: `app/pages/members.vue` — script.** After `const toast = useToast()`, add:
```ts
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
```

- [ ] **Step 3: `app/pages/members.vue` — replace the Members `<section>`** (the one starting `<section>` with `<h2>…Members</h2>`) with:
```vue
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
```

- [ ] **Step 4: Typecheck + tests + build + commit.** `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; pass; build ok).
```bash
git add app/composables/useTeam.ts app/pages/members.vue
git commit -m "feat(team): role change, password reset, and remove controls on the Team page"
```

---

## Task 3 — Responsive sidebar (drawer on mobile)

**Files:** Modify `app/layouts/default.vue`.

> On `<md` the pinned `w-60` sidebar becomes a slide-in drawer toggled by a header hamburger, with a backdrop; on `md+` it stays static (current behavior). Read the file first.

- [ ] **Step 1: Script** — after `const menuOpen = ref(false)`, add:
```ts
const navOpen = ref(false)
watch(() => route.path, () => { navOpen.value = false })
```
(`route` and `watch` are already available — `route` is declared at the top; `watch` is auto-imported.)

- [ ] **Step 2: Backdrop + drawer aside.** Immediately INSIDE the outer `<div class="flex h-dvh overflow-hidden bg-canvas text-ink">` and BEFORE the `<aside…>`, add a mobile backdrop:
```vue
    <div v-if="navOpen" class="fixed inset-0 z-30 bg-ink/40 md:hidden" @click="navOpen = false" />
```
Then change the `<aside>` opening tag's class from:
```
class="flex h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface p-4"
```
to:
```
class="fixed inset-y-0 left-0 z-40 flex h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface p-4 transition-transform md:static md:translate-x-0"
:class="navOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
```

- [ ] **Step 3: Header hamburger.** Change the `<header>` opening tag from:
```
class="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface/80 px-6 backdrop-blur"
```
to:
```
class="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur md:px-6"
```
Inside the header, BEFORE the `<h1>…</h1>`, add the hamburger (hidden on md+):
```vue
        <button class="-ml-1 rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink md:hidden" aria-label="Open menu" @click="navOpen = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
```
And change the `#topbar-actions` div so it sits on the right now the header is no longer `justify-between`:
```
<div id="topbar-actions" class="ml-auto flex items-center gap-2" />
```

- [ ] **Step 4: Typecheck + build + commit.** `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; pass; build ok).
```bash
git add app/layouts/default.vue
git commit -m "feat(ui): responsive sidebar — slide-in drawer + hamburger on small screens"
```

---

## Task 4 — Toast feedback across Settings

**Files:** Modify `app/pages/settings.vue`.

> Wire success/error toasts into every Settings mutation handler. Read the file first; it has these async handlers: `persistSettings`, `toggleField`, `addArea`, `removeArea`, `saveName`, `addStatus`, `rename`, `recolor`, `remove`, `move`.

- [ ] **Step 1:** Add `const toast = useToast()` to `<script setup>` (after the existing composable declarations).

- [ ] **Step 2:** Wrap each handler's API call in try/catch with a toast. Apply these (keep existing logic; add the toast lines + error handling):
  - `saveName` → success `'Workspace name saved'`, error `'Could not save the workspace name'`.
  - `addStatus` → success `'Status added'`, error `'Could not add the status'`.
  - `rename` (status label) → error `'Could not rename the status'` (no success toast — inline edit).
  - `recolor` → error `'Could not update the colour'` (no success toast).
  - `remove` (status) → success `'Status removed'`, error `'Could not remove the status'`.
  - `move` (reorder) → error `'Could not reorder statuses'` (no success toast).
  - `persistSettings` (covers `toggleField`/`addArea`/`removeArea`) → success `'Settings saved'`, error `'Could not save settings'`. (Add the try/catch in `persistSettings` itself, wrapping the existing `updateSettings`/`refreshWs`/`wsSettings.load(true)` calls; the three callers stay as-is.)

  Use the existing pattern: `try { …existing await…; toast.success('…') } catch (e: any) { toast.error(e?.data?.message ?? '…') }`. For handlers that mutate local state optimistically before the call (e.g. `toggleField`/`addArea`/`removeArea` set `enabled`/`areas` then call `persistSettings`), on error in `persistSettings` also `await refreshWs()` + `await wsSettings.load(true)` to resync from the server (revert the optimistic change), then re-throw is not needed — just toast.

- [ ] **Step 3: Typecheck + tests + build + commit.** `pnpm exec nuxi typecheck && pnpm test:run && pnpm build` (0; pass; build ok).
```bash
git add app/pages/settings.vue
git commit -m "feat(settings): toast feedback on workspace, status, optional-field and area changes"
```

---

## Task 5 — Full verification + smoke + merge

- [ ] **Step 1:** `pnpm test:run` (all pass, incl. `member.spec.ts`), `pnpm exec nuxi typecheck` (0), `pnpm build` (ok).
- [ ] **Step 2: Smoke (dev + MySQL, as Owner):**
  1. **Team:** change an agent↔owner role (badge/select updates); try to demote the only owner → blocked with a toast; reset an agent's password → set a new one → log in as that agent with it; remove a member → confirm → their leads now show as assigned to you; you can't remove yourself.
  2. **Responsive:** narrow the window (or open on a phone) → the sidebar collapses; the hamburger opens the drawer; tapping a link or the backdrop closes it; on desktop it stays pinned.
  3. **Settings:** every change (rename, add/rename/recolor/remove/reorder status, toggle optional field, add/remove area) shows a success or error toast.
- [ ] **Step 3: Merge.** `git checkout master && git merge --ff-only feat/polish && git branch -d feat/polish`

## Done criteria
- Tests green, typecheck 0, build ok. Owners can manage members (role/remove/reset) with a last-owner guard and lead-reassignment-on-removal; the sidebar is usable on phones; Settings gives toast feedback. No DB migration required.
