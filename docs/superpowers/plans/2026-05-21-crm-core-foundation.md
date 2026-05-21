# CRM Core Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working, self-hostable property-agent CRM that boots, lets you log in, and work a leads call-list (add/edit, inline status, Call/WhatsApp), with owner/agent visibility enforced server-side.

**Architecture:** Nuxt 4 full-stack app. Vue components → composables → Nitro API routes → repository layer → Drizzle → MySQL. Auth via `nuxt-auth-utils` (sealed-cookie sessions). The "agent sees own / owner sees all" rule lives in one pure function (`leadVisibilityScope`) used by every leads query. Pure logic (phone, schemas, visibility) is unit-tested; DB-backed endpoints are verified via a seed + smoke run.

**Tech Stack:** Nuxt 4 (Vue 3 + TS), Tailwind CSS v4 (`@tailwindcss/vite`), Drizzle ORM + `mysql2`, `nuxt-auth-utils`, `zod`, `libphonenumber-js`, Vitest (`happy-dom`), `@vue/test-utils`, pnpm.

**Scope note:** This is Plan 1 of 6 for Phase 1 (CRM Core). Follow-on plans: 2) Import wizard, 3) Follow-ups/Due Today, 4) Settings, 5) Members & invites, 6) PWA + deploy. Spec: `docs/superpowers/specs/2026-05-21-property-crm-core-design.md`.

**Conventions (all tasks):**
- Run commands from the project root `/Users/brendxn___/Desktop/PWA-PropertyAgentCRM`.
- Tests are named `*.spec.ts` and live next to the code they test.
- Run a single test file with `pnpm vitest run <path>`; run all with `pnpm test:run`.
- Commit after each task with the message shown in its final step.
- Nuxt import aliases: `~~/` = project root (use for `server/` and `shared/`), `~/` = `app/`.

---

## Task 1: Scaffold project & tooling

**Files:**
- Create: `package.json`, `nuxt.config.ts`, `tsconfig.json`, `vitest.config.ts`, `app/app.vue`, `app/assets/css/main.css`, `.env.example`, `.node-version`
- Test: `shared/utils/smoke.spec.ts`

- [ ] **Step 1: Initialize and install dependencies**

Run:
```bash
pnpm dlx nuxi@latest init . --packageManager pnpm --gitInit false --no-install
pnpm add drizzle-orm mysql2 nuxt-auth-utils zod libphonenumber-js
pnpm add -D drizzle-kit @tailwindcss/vite tailwindcss vitest happy-dom @vue/test-utils @nuxt/test-utils
```
Expected: `node_modules/` populated; `nuxt`, `vue` present in `package.json`. If `nuxi init` asks to overwrite `.gitignore`, keep ours (decline overwrite or restore it after).

- [ ] **Step 2: Configure `nuxt.config.ts`**

Replace `nuxt.config.ts` with:
```ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',
  devtools: { enabled: true },
  modules: ['nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
  },
})
```

- [ ] **Step 3: Add Tailwind entry CSS**

Create `app/assets/css/main.css`:
```css
@import "tailwindcss";
```

- [ ] **Step 4: Replace `app/app.vue`**

```vue
<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
```

- [ ] **Step 5: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/.nuxt/**', '**/.output/**'],
  },
  resolve: {
    alias: {
      '~~': fileURLToPath(new URL('./', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
})
```

- [ ] **Step 6: Add test scripts to `package.json`**

In the `"scripts"` block add:
```json
"test": "vitest",
"test:run": "vitest run",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:seed": "tsx server/db/seed.ts"
```
Then run `pnpm add -D tsx`.

- [ ] **Step 7: Write the smoke test**

Create `shared/utils/smoke.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('toolchain smoke', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 8: Run the smoke test**

Run: `pnpm vitest run shared/utils/smoke.spec.ts`
Expected: PASS, 1 test.

- [ ] **Step 9: Create `.env.example`**

```bash
DATABASE_URL="mysql://crm:password@127.0.0.1:3306/crm"
# 32+ random chars; generate with: openssl rand -base64 32
NUXT_SESSION_PASSWORD=""
NUXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Nuxt 4 + Tailwind v4 + Vitest toolchain"
```

---

## Task 2: Database schema, types & client

**Files:**
- Create: `shared/types.ts`, `server/db/schema.ts`, `server/utils/db.ts`, `drizzle.config.ts`
- Test: `server/db/schema.spec.ts`

- [ ] **Step 1: Define shared types**

Create `shared/types.ts`:
```ts
export type Role = 'owner' | 'agent'
export type Intent = 'buy' | 'rent' | 'sell' | 'invest'
export type LeadSource =
  | 'manual' | 'import' | 'whatsapp' | 'propertyguru'
  | 'iproperty' | 'facebook' | 'referral' | 'walkin'
export type ActivityType =
  | 'created' | 'call' | 'whatsapp' | 'status_change'
  | 'note' | 'assigned' | 'imported'

export type OptionalFieldKey =
  | 'email' | 'intent' | 'propertyType' | 'budget' | 'tags'

export interface WorkspaceSettings {
  enabledOptionalFields: OptionalFieldKey[]
  areas: string[]
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  enabledOptionalFields: [],
  areas: [],
}
```

- [ ] **Step 2: Write the schema introspection test (failing)**

Create `server/db/schema.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/mysql-core'
import { leads, users, workspaces, workspaceMembers, statuses, activities } from './schema'

describe('db schema', () => {
  it('defines all core tables', () => {
    expect(getTableConfig(users).name).toBe('users')
    expect(getTableConfig(workspaces).name).toBe('workspaces')
    expect(getTableConfig(workspaceMembers).name).toBe('workspace_members')
    expect(getTableConfig(statuses).name).toBe('statuses')
    expect(getTableConfig(leads).name).toBe('leads')
    expect(getTableConfig(activities).name).toBe('activities')
  })

  it('leads table carries the call-list core columns', () => {
    const cols = getTableConfig(leads).columns.map((c) => c.name)
    for (const c of ['name', 'phone_e164', 'phone_raw', 'area', 'status_id', 'remarks', 'assigned_to', 'next_follow_up_at']) {
      expect(cols).toContain(c)
    }
  })
})
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `pnpm vitest run server/db/schema.spec.ts`
Expected: FAIL — cannot resolve `./schema`.

- [ ] **Step 4: Implement the schema**

Create `server/db/schema.ts`:
```ts
import {
  mysqlTable, int, varchar, text, boolean, timestamp,
  mysqlEnum, json, uniqueIndex, index,
} from 'drizzle-orm/mysql-core'
import type { WorkspaceSettings } from '~~/shared/types'

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 120 }).notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const workspaces = mysqlTable('workspaces', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  settings: json('settings').$type<WorkspaceSettings>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const workspaceMembers = mysqlTable('workspace_members', {
  id: int('id').autoincrement().primaryKey(),
  workspaceId: int('workspace_id').notNull(),
  userId: int('user_id').notNull(),
  role: mysqlEnum('role', ['owner', 'agent']).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({ uqMember: uniqueIndex('uq_member').on(t.workspaceId, t.userId) }))

export const statuses = mysqlTable('statuses', {
  id: int('id').autoincrement().primaryKey(),
  workspaceId: int('workspace_id').notNull(),
  label: varchar('label', { length: 80 }).notNull(),
  color: varchar('color', { length: 16 }).notNull().default('#6b7280'),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({ idxWs: index('idx_status_ws').on(t.workspaceId) }))

export const leads = mysqlTable('leads', {
  id: int('id').autoincrement().primaryKey(),
  workspaceId: int('workspace_id').notNull(),
  name: varchar('name', { length: 200 }).notNull().default(''),
  phoneE164: varchar('phone_e164', { length: 32 }),
  phoneRaw: varchar('phone_raw', { length: 40 }),
  phoneValid: boolean('phone_valid').notNull().default(false),
  area: varchar('area', { length: 120 }).notNull().default(''),
  statusId: int('status_id'),
  remarks: text('remarks'),
  assignedTo: int('assigned_to'),
  source: mysqlEnum('source', ['manual', 'import', 'whatsapp', 'propertyguru', 'iproperty', 'facebook', 'referral', 'walkin']).notNull().default('manual'),
  email: varchar('email', { length: 255 }),
  intent: mysqlEnum('intent', ['buy', 'rent', 'sell', 'invest']),
  propertyType: varchar('property_type', { length: 80 }),
  budgetMin: int('budget_min'),
  budgetMax: int('budget_max'),
  nextFollowUpAt: timestamp('next_follow_up_at'),
  tags: json('tags').$type<string[]>(),
  createdBy: int('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  idxWsStatus: index('idx_lead_ws_status').on(t.workspaceId, t.statusId),
  idxWsAssigned: index('idx_lead_ws_assigned').on(t.workspaceId, t.assignedTo),
  idxWsFollow: index('idx_lead_ws_follow').on(t.workspaceId, t.nextFollowUpAt),
  idxWsPhone: index('idx_lead_ws_phone').on(t.workspaceId, t.phoneE164),
}))

export const activities = mysqlTable('activities', {
  id: int('id').autoincrement().primaryKey(),
  workspaceId: int('workspace_id').notNull(),
  leadId: int('lead_id').notNull(),
  type: mysqlEnum('type', ['created', 'call', 'whatsapp', 'status_change', 'note', 'assigned', 'imported']).notNull(),
  detail: json('detail').$type<Record<string, unknown>>(),
  actorUserId: int('actor_user_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({ idxWsLead: index('idx_act_ws_lead').on(t.workspaceId, t.leadId, t.createdAt) }))
```

- [ ] **Step 5: Run the schema test to confirm pass**

Run: `pnpm vitest run server/db/schema.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Add the Drizzle client and config**

Create `server/utils/db.ts`:
```ts
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from '~~/server/db/schema'

let pool: mysql.Pool | null = null
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  if (dbInstance) return dbInstance
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  pool = mysql.createPool(url)
  dbInstance = drizzle(pool, { schema, mode: 'default' })
  return dbInstance
}
```

Create `drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'mysql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

- [ ] **Step 7: Generate the initial migration**

Run: `pnpm db:generate`
Expected: a SQL file appears in `server/db/migrations/`. (No DB connection needed for `generate`.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(db): add Drizzle schema, client, and initial migration"
```

---

## Task 3: Phone normalization util (TDD)

**Files:**
- Create: `shared/utils/phone.ts`
- Test: `shared/utils/phone.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/utils/phone.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { normalizePhone, dedupeKey } from './phone'

describe('normalizePhone (region MY)', () => {
  it('keeps a country-coded number without plus (sheet format)', () => {
    expect(normalizePhone('60128975215')).toEqual({ raw: '60128975215', e164: '+60128975215', valid: true })
  })
  it('upgrades a local number with leading zero', () => {
    expect(normalizePhone('0128975215').e164).toBe('+60128975215')
  })
  it('accepts a pretty-printed +60 number', () => {
    expect(normalizePhone('+60 12-897 5215').e164).toBe('+60128975215')
  })
  it('flags an obviously-too-short number as invalid', () => {
    expect(normalizePhone('12')).toEqual({ raw: '12', e164: null, valid: false })
  })
  it('treats empty input as invalid', () => {
    expect(normalizePhone('').valid).toBe(false)
  })
})

describe('dedupeKey', () => {
  it('uses the e164 when valid', () => {
    expect(dedupeKey(normalizePhone('60128975215'))).toBe('+60128975215')
  })
  it('falls back to digits when invalid', () => {
    expect(dedupeKey(normalizePhone('12'))).toBe('12')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm vitest run shared/utils/phone.spec.ts`
Expected: FAIL — cannot resolve `./phone`.

- [ ] **Step 3: Implement**

Create `shared/utils/phone.ts`:
```ts
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

export interface NormalizedPhone {
  raw: string
  e164: string | null
  valid: boolean
}

export function normalizePhone(input: string, region: CountryCode = 'MY'): NormalizedPhone {
  const raw = (input ?? '').trim()
  if (!raw) return { raw, e164: null, valid: false }

  const digits = raw.replace(/[^\d+]/g, '')
  let candidate = digits
  if (!digits.startsWith('+')) {
    candidate = digits.startsWith('60') ? `+${digits}` : digits
  }

  const parsed = parsePhoneNumberFromString(candidate, region)
  if (parsed && parsed.isValid()) {
    return { raw, e164: parsed.number, valid: true }
  }
  return { raw, e164: null, valid: false }
}

export function dedupeKey(p: NormalizedPhone): string {
  return p.e164 ?? p.raw.replace(/[^\d]/g, '')
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `pnpm vitest run shared/utils/phone.spec.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(phone): MY phone normalization + dedupe key"
```

---

## Task 4: Lead input schema (TDD)

**Files:**
- Create: `shared/schemas/lead.ts`
- Test: `shared/schemas/lead.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/schemas/lead.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { leadInputSchema } from './lead'

describe('leadInputSchema', () => {
  it('accepts a lead with only a name', () => {
    const r = leadInputSchema.safeParse({ name: 'Dean Cheong' })
    expect(r.success).toBe(true)
  })
  it('accepts a lead with only a phone', () => {
    const r = leadInputSchema.safeParse({ phone: '60128975215' })
    expect(r.success).toBe(true)
  })
  it('rejects a lead with neither name nor phone', () => {
    const r = leadInputSchema.safeParse({ area: 'Petaling Jaya' })
    expect(r.success).toBe(false)
  })
  it('rejects an invalid email when provided', () => {
    const r = leadInputSchema.safeParse({ name: 'X', email: 'not-an-email' })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm vitest run shared/schemas/lead.spec.ts`
Expected: FAIL — cannot resolve `./lead`.

- [ ] **Step 3: Implement**

Create `shared/schemas/lead.ts`:
```ts
import { z } from 'zod'

// Base field shape — no `.default()` so partial updates only touch provided
// fields. The repository coalesces undefined values (`?? ''` / `?? []` / `?? null`).
export const leadFields = z.object({
  name: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  area: z.string().trim().max(120).optional(),
  statusId: z.number().int().positive().nullable().optional(),
  remarks: z.string().max(5000).optional(),
  assignedTo: z.number().int().positive().nullable().optional(),
  email: z.union([z.string().trim().email(), z.literal('')]).optional(),
  intent: z.enum(['buy', 'rent', 'sell', 'invest']).optional(),
  propertyType: z.string().trim().max(80).optional(),
  budgetMin: z.number().int().nonnegative().nullable().optional(),
  budgetMax: z.number().int().nonnegative().nullable().optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
})

// Create: requires at least a name or a phone.
export const leadInputSchema = leadFields.refine(
  (d) => Boolean(d.name?.length) || Boolean(d.phone?.length),
  { message: 'A lead needs at least a name or a phone', path: ['name'] },
)

// Update: every field optional, no defaults (no accidental overwrite of omitted fields).
export const leadPatchSchema = leadFields.partial()

export type LeadInput = z.infer<typeof leadInputSchema>
export type LeadPatch = z.infer<typeof leadPatchSchema>
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `pnpm vitest run shared/schemas/lead.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(schema): lead input validation (name-or-phone required)"
```

---

## Task 5: Visibility scope — the security choke-point (TDD)

**Files:**
- Create: `shared/utils/visibility.ts`
- Test: `shared/utils/visibility.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/utils/visibility.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { leadVisibilityScope } from './visibility'

describe('leadVisibilityScope', () => {
  it('owner sees the whole workspace', () => {
    expect(leadVisibilityScope({ workspaceId: 7, role: 'owner', userId: 1 }))
      .toEqual({ workspaceId: 7 })
  })
  it('agent is restricted to their own assigned leads', () => {
    expect(leadVisibilityScope({ workspaceId: 7, role: 'agent', userId: 3 }))
      .toEqual({ workspaceId: 7, assignedTo: 3 })
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm vitest run shared/utils/visibility.spec.ts`
Expected: FAIL — cannot resolve `./visibility`.

- [ ] **Step 3: Implement**

Create `shared/utils/visibility.ts`:
```ts
import type { Role } from '~~/shared/types'

export interface VisibilityContext {
  workspaceId: number
  role: Role
  userId: number
}

export interface LeadScope {
  workspaceId: number
  assignedTo?: number
}

/** The entire "agent sees own / owner sees all" rule. Used by every leads query. */
export function leadVisibilityScope(ctx: VisibilityContext): LeadScope {
  if (ctx.role === 'agent') {
    return { workspaceId: ctx.workspaceId, assignedTo: ctx.userId }
  }
  return { workspaceId: ctx.workspaceId }
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `pnpm vitest run shared/utils/visibility.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(security): lead visibility scope (owner all / agent own)"
```

---

## Task 6: Default statuses & session payload (TDD)

**Files:**
- Create: `shared/defaults.ts`, `server/utils/session-payload.ts`
- Test: `shared/defaults.spec.ts`, `server/utils/session-payload.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `shared/defaults.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_STATUS_LABELS } from './defaults'

describe('default statuses', () => {
  it('starts with the friend\'s call-list statuses', () => {
    expect(DEFAULT_STATUS_LABELS[0]).toBe('New')
    expect(DEFAULT_STATUS_LABELS).toContain('No Answer')
    expect(DEFAULT_STATUS_LABELS).toContain('Callback')
    expect(DEFAULT_STATUS_LABELS).toContain('Closed - Won')
  })
})
```

Create `server/utils/session-payload.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildSessionPayload } from './session-payload'

describe('buildSessionPayload', () => {
  it('packs user, workspace and role for the cookie', () => {
    const p = buildSessionPayload(
      { id: 5, email: 'a@b.com', name: 'Ana' },
      { workspaceId: 2, role: 'owner' },
    )
    expect(p).toEqual({
      user: { id: 5, email: 'a@b.com', name: 'Ana' },
      workspaceId: 2,
      role: 'owner',
    })
  })
})
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `pnpm vitest run shared/defaults.spec.ts server/utils/session-payload.spec.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

Create `shared/defaults.ts`:
```ts
export const DEFAULT_STATUS_LABELS = [
  'New',
  'No Answer',
  'Busy',
  'Spoke - Interested',
  'Spoke - Not Interested',
  'Callback',
  'Closed - Won',
  'Closed - Lost',
] as const

export const DEFAULT_STATUS_COLORS: Record<string, string> = {
  'New': '#6b7280',
  'No Answer': '#b91c1c',
  'Busy': '#a16207',
  'Spoke - Interested': '#15803d',
  'Spoke - Not Interested': '#6b7280',
  'Callback': '#a16207',
  'Closed - Won': '#15803d',
  'Closed - Lost': '#6b7280',
}
```

Create `server/utils/session-payload.ts`:
```ts
import type { Role } from '~~/shared/types'

export interface SessionUser {
  id: number
  email: string
  name: string
}

export interface SessionPayload {
  user: SessionUser
  workspaceId: number
  role: Role
}

export function buildSessionPayload(
  user: SessionUser,
  ctx: { workspaceId: number; role: Role },
): SessionPayload {
  return { user, workspaceId: ctx.workspaceId, role: ctx.role }
}
```

- [ ] **Step 4: Run them to confirm they pass**

Run: `pnpm vitest run shared/defaults.spec.ts server/utils/session-payload.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: default call-list statuses + session payload builder"
```

---

## Task 7: Auth endpoints (setup, login, logout, state)

**Files:**
- Create: `server/api/auth/state.get.ts`, `server/api/auth/setup.post.ts`, `server/api/auth/login.post.ts`, `server/api/auth/logout.post.ts`
- Modify: none

> Note: these are DB-backed; they are verified by the smoke run in Task 14. The pure logic they call (`buildSessionPayload`, `DEFAULT_STATUS_LABELS`) is already unit-tested.

- [ ] **Step 1: First-run state endpoint**

Create `server/api/auth/state.get.ts`:
```ts
import { sql } from 'drizzle-orm'
import { users } from '~~/server/db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
  return { needsSetup: Number(count) === 0 }
})
```

- [ ] **Step 2: First-run setup endpoint (creates owner + workspace + default statuses)**

Create `server/api/auth/setup.post.ts`:
```ts
import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { users, workspaces, workspaceMembers, statuses } from '~~/server/db/schema'
import { DEFAULT_STATUS_LABELS, DEFAULT_STATUS_COLORS } from '~~/shared/defaults'
import { DEFAULT_WORKSPACE_SETTINGS } from '~~/shared/types'
import { buildSessionPayload } from '~~/server/utils/session-payload'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  workspaceName: z.string().trim().min(1).max(160),
})

export default defineEventHandler(async (event) => {
  const db = useDb()
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users)
  if (Number(count) > 0) {
    throw createError({ statusCode: 409, message: 'Setup already completed' })
  }
  const body = bodySchema.parse(await readBody(event))

  const passwordHash = await hashPassword(body.password)
  const [userRes] = await db.insert(users).values({
    email: body.email, passwordHash, name: body.name,
  })
  const userId = userRes.insertId

  const [wsRes] = await db.insert(workspaces).values({
    name: body.workspaceName, settings: DEFAULT_WORKSPACE_SETTINGS,
  })
  const workspaceId = wsRes.insertId

  await db.insert(workspaceMembers).values({ workspaceId, userId, role: 'owner' })
  await db.insert(statuses).values(
    DEFAULT_STATUS_LABELS.map((label, i) => ({
      workspaceId, label, color: DEFAULT_STATUS_COLORS[label] ?? '#6b7280', sortOrder: i,
    })),
  )

  await setUserSession(event, buildSessionPayload(
    { id: userId, email: body.email, name: body.name },
    { workspaceId, role: 'owner' },
  ))
  return { ok: true }
})
```

- [ ] **Step 3: Login endpoint**

Create `server/api/auth/login.post.ts`:
```ts
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { users, workspaceMembers } from '~~/server/db/schema'
import { buildSessionPayload } from '~~/server/utils/session-payload'

const bodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const db = useDb()
  const { email, password } = bodySchema.parse(await readBody(event))

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw createError({ statusCode: 401, message: 'Invalid email or password' })
  }

  const [member] = await db.select().from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id)).limit(1)
  if (!member) {
    throw createError({ statusCode: 403, message: 'No workspace for this account' })
  }

  await setUserSession(event, buildSessionPayload(
    { id: user.id, email: user.email, name: user.name },
    { workspaceId: member.workspaceId, role: member.role },
  ))
  return { ok: true }
})
```

- [ ] **Step 4: Logout endpoint**

Create `server/api/auth/logout.post.ts`:
```ts
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { ok: true }
})
```

- [ ] **Step 5: Type-check the server code**

Run: `pnpm exec nuxi typecheck`
Expected: no type errors in `server/api/auth/*`. (If `nuxi typecheck` needs deps, run `pnpm add -D vue-tsc typescript` first.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(auth): first-run setup, login, logout, state endpoints"
```

---

## Task 8: Request context resolver + global auth middleware

**Files:**
- Create: `server/utils/context.ts`, `app/middleware/auth.global.ts`
- Test: `server/utils/context.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `server/utils/context.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { contextFromSession } from './context'

describe('contextFromSession', () => {
  it('extracts userId, workspaceId and role', () => {
    const ctx = contextFromSession({
      user: { id: 9, email: 'x@y.com', name: 'X' }, workspaceId: 4, role: 'agent',
    })
    expect(ctx).toEqual({ userId: 9, workspaceId: 4, role: 'agent' })
  })
  it('throws when the session has no workspace', () => {
    expect(() => contextFromSession({ user: { id: 9, email: 'x@y.com', name: 'X' } } as any))
      .toThrowError()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm vitest run server/utils/context.spec.ts`
Expected: FAIL — cannot resolve `./context`.

- [ ] **Step 3: Implement**

Create `server/utils/context.ts`:
```ts
import type { H3Event } from 'h3'
import type { Role } from '~~/shared/types'
import type { SessionPayload } from './session-payload'

export interface RequestContext {
  userId: number
  workspaceId: number
  role: Role
}

export function contextFromSession(session: Partial<SessionPayload>): RequestContext {
  const userId = Number(session?.user?.id)
  const workspaceId = Number(session?.workspaceId)
  const role = session?.role as Role | undefined
  if (!userId || !workspaceId || (role !== 'owner' && role !== 'agent')) {
    throw createError({ statusCode: 401, message: 'No workspace context' })
  }
  return { userId, workspaceId, role }
}

export async function requireContext(event: H3Event): Promise<RequestContext> {
  const session = await requireUserSession(event)
  return contextFromSession(session as Partial<SessionPayload>)
}
```

> `createError` and `requireUserSession` are Nitro auto-imports. In the unit test, `createError` resolves via Nuxt's test stubs; if the test environment cannot find it, add this line at the top of `context.spec.ts`: `globalThis.createError = (e: any) => Object.assign(new Error(e.message), e)` before the import.

- [ ] **Step 4: Run it to confirm it passes**

Run: `pnpm vitest run server/utils/context.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Add the global auth middleware**

Create `app/middleware/auth.global.ts`:
```ts
export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/setup']
  const { loggedIn, fetch: fetchSession } = useUserSession()
  await fetchSession()

  const { needsSetup } = await $fetch<{ needsSetup: boolean }>('/api/auth/state')
  if (needsSetup && to.path !== '/setup') return navigateTo('/setup')
  if (!needsSetup && to.path === '/setup') return navigateTo('/login')

  if (!loggedIn.value && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }
  if (loggedIn.value && publicRoutes.includes(to.path)) {
    return navigateTo('/')
  }
})
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(auth): request context resolver + global route middleware"
```

---

## Task 9: Repositories (leads, activities, statuses)

**Files:**
- Create: `server/utils/activities.repo.ts`, `server/utils/leads.repo.ts`, `server/utils/statuses.repo.ts`
- Test: `server/utils/leads.repo.spec.ts`

- [ ] **Step 1: Write the failing test for the scope translation**

Create `server/utils/leads.repo.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildLeadWhereParts } from './leads.repo'

describe('buildLeadWhereParts', () => {
  it('owner filters by workspace only', () => {
    const parts = buildLeadWhereParts({ workspaceId: 7, role: 'owner', userId: 1 }, {})
    expect(parts).toEqual([{ col: 'workspaceId', value: 7 }])
  })
  it('agent adds an assignedTo filter', () => {
    const parts = buildLeadWhereParts({ workspaceId: 7, role: 'agent', userId: 3 }, {})
    expect(parts).toContainEqual({ col: 'workspaceId', value: 7 })
    expect(parts).toContainEqual({ col: 'assignedTo', value: 3 })
  })
  it('applies a status filter when provided', () => {
    const parts = buildLeadWhereParts({ workspaceId: 7, role: 'owner', userId: 1 }, { statusId: 5 })
    expect(parts).toContainEqual({ col: 'statusId', value: 5 })
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm vitest run server/utils/leads.repo.spec.ts`
Expected: FAIL — cannot resolve `./leads.repo`.

- [ ] **Step 3: Implement the activities repo**

Create `server/utils/activities.repo.ts`:
```ts
import { and, desc, eq } from 'drizzle-orm'
import { activities } from '~~/server/db/schema'
import type { ActivityType } from '~~/shared/types'
import type { RequestContext } from './context'

export async function logActivity(
  ctx: RequestContext,
  leadId: number,
  type: ActivityType,
  detail?: Record<string, unknown>,
) {
  const db = useDb()
  await db.insert(activities).values({
    workspaceId: ctx.workspaceId, leadId, type, detail: detail ?? null, actorUserId: ctx.userId,
  })
}

export async function listActivities(ctx: RequestContext, leadId: number) {
  const db = useDb()
  return db.select().from(activities)
    .where(and(eq(activities.workspaceId, ctx.workspaceId), eq(activities.leadId, leadId)))
    .orderBy(desc(activities.createdAt))
    .limit(200)
}
```

- [ ] **Step 4: Implement the leads repo (with the testable where-builder)**

Create `server/utils/leads.repo.ts`:
```ts
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm'
import { leads } from '~~/server/db/schema'
import { leadVisibilityScope, type VisibilityContext } from '~~/shared/utils/visibility'
import { normalizePhone } from '~~/shared/utils/phone'
import type { LeadInput } from '~~/shared/schemas/lead'
import type { RequestContext } from './context'

export interface LeadListFilters {
  statusId?: number
  area?: string
  assignedTo?: number
  search?: string
}

export interface WherePart { col: 'workspaceId' | 'assignedTo' | 'statusId' | 'area'; value: number | string }

/** Pure, testable: derives the equality where-parts from visibility + filters. */
export function buildLeadWhereParts(ctx: VisibilityContext, filters: LeadListFilters): WherePart[] {
  const scope = leadVisibilityScope(ctx)
  const parts: WherePart[] = [{ col: 'workspaceId', value: scope.workspaceId }]
  if (scope.assignedTo !== undefined) parts.push({ col: 'assignedTo', value: scope.assignedTo })
  if (filters.assignedTo !== undefined && ctx.role === 'owner') {
    parts.push({ col: 'assignedTo', value: filters.assignedTo })
  }
  if (filters.statusId !== undefined) parts.push({ col: 'statusId', value: filters.statusId })
  if (filters.area) parts.push({ col: 'area', value: filters.area })
  return parts
}

const COL = { workspaceId: leads.workspaceId, assignedTo: leads.assignedTo, statusId: leads.statusId, area: leads.area }

function whereFor(ctx: VisibilityContext, filters: LeadListFilters) {
  const conds = buildLeadWhereParts(ctx, filters).map((p) => eq(COL[p.col], p.value as never))
  if (filters.search) {
    const q = `%${filters.search}%`
    conds.push(or(like(leads.name, q), like(leads.phoneE164, q), like(leads.phoneRaw, q))!)
  }
  return and(...conds)
}

export interface ListOpts extends LeadListFilters {
  page?: number
  pageSize?: number
  sort?: 'name' | 'createdAt' | 'area'
  dir?: 'asc' | 'desc'
}

export async function listLeads(ctx: RequestContext, opts: ListOpts) {
  const db = useDb()
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50))
  const where = whereFor(ctx, opts)
  const sortCol = opts.sort === 'name' ? leads.name : opts.sort === 'area' ? leads.area : leads.createdAt
  const order = opts.dir === 'asc' ? asc(sortCol) : desc(sortCol)

  const rows = await db.select().from(leads).where(where).orderBy(order)
    .limit(pageSize).offset((page - 1) * pageSize)
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(leads).where(where)
  return { rows, total: Number(total), page, pageSize }
}

export async function getLead(ctx: RequestContext, id: number) {
  const db = useDb()
  const [row] = await db.select().from(leads)
    .where(and(whereFor(ctx, {}), eq(leads.id, id))).limit(1)
  return row ?? null
}

function applyPhone<T extends { phone?: string }>(data: T) {
  const p = normalizePhone(data.phone ?? '')
  return { phoneRaw: p.raw || null, phoneE164: p.e164, phoneValid: p.valid }
}

export async function createLead(ctx: RequestContext, data: LeadInput) {
  const db = useDb()
  const phone = applyPhone(data)
  const [res] = await db.insert(leads).values({
    workspaceId: ctx.workspaceId,
    name: data.name ?? '',
    area: data.area ?? '',
    remarks: data.remarks ?? '',
    statusId: data.statusId ?? null,
    assignedTo: data.assignedTo ?? ctx.userId,
    email: data.email || null,
    intent: data.intent ?? null,
    propertyType: data.propertyType ?? null,
    budgetMin: data.budgetMin ?? null,
    budgetMax: data.budgetMax ?? null,
    nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
    tags: data.tags ?? [],
    source: 'manual',
    createdBy: ctx.userId,
    ...phone,
  })
  return getLead(ctx, res.insertId)
}

export async function updateLead(ctx: RequestContext, id: number, data: Partial<LeadInput>) {
  const db = useDb()
  const existing = await getLead(ctx, id)
  if (!existing) return null
  const patch: Record<string, unknown> = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.area !== undefined) patch.area = data.area
  if (data.remarks !== undefined) patch.remarks = data.remarks
  if (data.statusId !== undefined) patch.statusId = data.statusId
  if (data.assignedTo !== undefined) patch.assignedTo = data.assignedTo
  if (data.nextFollowUpAt !== undefined) patch.nextFollowUpAt = data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null
  if (data.email !== undefined) patch.email = data.email || null
  if (data.intent !== undefined) patch.intent = data.intent ?? null
  if (data.propertyType !== undefined) patch.propertyType = data.propertyType ?? null
  if (data.budgetMin !== undefined) patch.budgetMin = data.budgetMin ?? null
  if (data.budgetMax !== undefined) patch.budgetMax = data.budgetMax ?? null
  if (data.tags !== undefined) patch.tags = data.tags
  if (data.phone !== undefined) Object.assign(patch, applyPhone(data as { phone?: string }))
  await db.update(leads).set(patch).where(and(eq(leads.workspaceId, ctx.workspaceId), eq(leads.id, id)))
  return getLead(ctx, id)
}

export async function deleteLead(ctx: RequestContext, id: number) {
  const db = useDb()
  await db.delete(leads).where(and(eq(leads.workspaceId, ctx.workspaceId), eq(leads.id, id)))
}
```

- [ ] **Step 5: Implement the statuses repo**

Create `server/utils/statuses.repo.ts`:
```ts
import { asc, eq } from 'drizzle-orm'
import { statuses } from '~~/server/db/schema'
import type { RequestContext } from './context'

export async function listStatuses(ctx: RequestContext) {
  const db = useDb()
  return db.select().from(statuses)
    .where(eq(statuses.workspaceId, ctx.workspaceId))
    .orderBy(asc(statuses.sortOrder))
}
```

- [ ] **Step 6: Run the repo test to confirm pass**

Run: `pnpm vitest run server/utils/leads.repo.spec.ts`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(repo): leads/activities/statuses repositories with visibility"
```

---

## Task 10: Leads & statuses API endpoints

**Files:**
- Create: `server/api/leads/index.get.ts`, `server/api/leads/index.post.ts`, `server/api/leads/[id].get.ts`, `server/api/leads/[id].patch.ts`, `server/api/leads/[id].delete.ts`, `server/api/leads/[id]/activities.get.ts`, `server/api/statuses/index.get.ts`

- [ ] **Step 1: List endpoint**

Create `server/api/leads/index.get.ts`:
```ts
import { listLeads } from '~~/server/utils/leads.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const q = getQuery(event)
  const num = (v: unknown) => (v === undefined || v === '' ? undefined : Number(v))
  return listLeads(ctx, {
    page: num(q.page), pageSize: num(q.pageSize),
    statusId: num(q.statusId), assignedTo: num(q.assignedTo),
    area: (q.area as string) || undefined,
    search: (q.search as string) || undefined,
    sort: (q.sort as 'name' | 'createdAt' | 'area') || 'createdAt',
    dir: (q.dir as 'asc' | 'desc') || 'desc',
  })
})
```

- [ ] **Step 2: Create endpoint (+ created activity)**

Create `server/api/leads/index.post.ts`:
```ts
import { leadInputSchema } from '~~/shared/schemas/lead'
import { createLead } from '~~/server/utils/leads.repo'
import { logActivity } from '~~/server/utils/activities.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const data = leadInputSchema.parse(await readBody(event))
  const lead = await createLead(ctx, data)
  if (lead) await logActivity(ctx, lead.id, 'created')
  return lead
})
```

- [ ] **Step 3: Update endpoint (+ status_change / assigned activity)**

Create `server/api/leads/[id].patch.ts`:
```ts
import { leadPatchSchema } from '~~/shared/schemas/lead'
import { getLead, updateLead } from '~~/server/utils/leads.repo'
import { logActivity } from '~~/server/utils/activities.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const id = Number(getRouterParam(event, 'id'))
  const data = leadPatchSchema.parse(await readBody(event))

  const before = await getLead(ctx, id)
  if (!before) throw createError({ statusCode: 404, message: 'Lead not found' })

  const lead = await updateLead(ctx, id, data)
  if (lead && data.statusId !== undefined && data.statusId !== before.statusId) {
    await logActivity(ctx, id, 'status_change', { from: before.statusId, to: data.statusId })
  }
  if (lead && data.assignedTo !== undefined && data.assignedTo !== before.assignedTo) {
    await logActivity(ctx, id, 'assigned', { to: data.assignedTo })
  }
  return lead
})
```

- [ ] **Step 4: Delete endpoint**

Create `server/api/leads/[id].delete.ts`:
```ts
import { getLead, deleteLead } from '~~/server/utils/leads.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const id = Number(getRouterParam(event, 'id'))
  const existing = await getLead(ctx, id)
  if (!existing) throw createError({ statusCode: 404, message: 'Lead not found' })
  await deleteLead(ctx, id)
  return { ok: true }
})
```

- [ ] **Step 5: Single-lead, activities + statuses endpoints**

Create `server/api/leads/[id].get.ts`:
```ts
import { getLead } from '~~/server/utils/leads.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const id = Number(getRouterParam(event, 'id'))
  const lead = await getLead(ctx, id)
  if (!lead) throw createError({ statusCode: 404, message: 'Lead not found' })
  return lead
})
```

Create `server/api/leads/[id]/activities.get.ts`:
```ts
import { listActivities } from '~~/server/utils/activities.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const id = Number(getRouterParam(event, 'id'))
  return listActivities(ctx, id)
})
```

Create `server/api/statuses/index.get.ts`:
```ts
import { listStatuses } from '~~/server/utils/statuses.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  return listStatuses(ctx)
})
```

- [ ] **Step 6: Type-check**

Run: `pnpm exec nuxi typecheck`
Expected: no errors in `server/api/leads/*` or `server/api/statuses/*`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(api): leads CRUD + bulk-free endpoints, statuses, activities"
```

---

## Task 11: Client composables

**Files:**
- Create: `app/composables/useStatuses.ts`, `app/composables/useLeads.ts`
- Test: `app/composables/useLeads.spec.ts`

- [ ] **Step 1: Write the failing test (query-string builder)**

Create `app/composables/useLeads.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildLeadsQuery } from './useLeads'

describe('buildLeadsQuery', () => {
  it('omits empty filters', () => {
    expect(buildLeadsQuery({ page: 1, pageSize: 50 })).toEqual({ page: 1, pageSize: 50 })
  })
  it('includes set filters', () => {
    expect(buildLeadsQuery({ page: 2, pageSize: 50, statusId: 3, search: 'dean' }))
      .toEqual({ page: 2, pageSize: 50, statusId: 3, search: 'dean' })
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm vitest run app/composables/useLeads.spec.ts`
Expected: FAIL — cannot resolve `./useLeads`.

- [ ] **Step 3: Implement `useLeads`**

Create `app/composables/useLeads.ts`:
```ts
import type { LeadInput } from '~~/shared/schemas/lead'

export interface LeadsQuery {
  page: number
  pageSize: number
  statusId?: number
  assignedTo?: number
  area?: string
  search?: string
  sort?: 'name' | 'createdAt' | 'area'
  dir?: 'asc' | 'desc'
}

/** Pure: strips undefined/empty values so the URL stays clean. */
export function buildLeadsQuery(q: LeadsQuery): Record<string, string | number> {
  const out: Record<string, string | number> = { page: q.page, pageSize: q.pageSize }
  if (q.statusId) out.statusId = q.statusId
  if (q.assignedTo) out.assignedTo = q.assignedTo
  if (q.area) out.area = q.area
  if (q.search) out.search = q.search
  if (q.sort) out.sort = q.sort
  if (q.dir) out.dir = q.dir
  return out
}

export function useLeads() {
  async function list(q: LeadsQuery) {
    return $fetch('/api/leads', { query: buildLeadsQuery(q) })
  }
  async function create(data: LeadInput) {
    return $fetch('/api/leads', { method: 'POST', body: data })
  }
  async function update(id: number, data: Partial<LeadInput>) {
    return $fetch(`/api/leads/${id}`, { method: 'PATCH', body: data })
  }
  async function remove(id: number) {
    return $fetch(`/api/leads/${id}`, { method: 'DELETE' })
  }
  return { list, create, update, remove }
}
```

- [ ] **Step 4: Implement `useStatuses`**

Create `app/composables/useStatuses.ts`:
```ts
export interface StatusRow {
  id: number
  label: string
  color: string
  sortOrder: number
}

export function useStatuses() {
  const statuses = useState<StatusRow[]>('statuses', () => [])
  async function load() {
    statuses.value = await $fetch<StatusRow[]>('/api/statuses')
    return statuses.value
  }
  function byId(id: number | null | undefined) {
    return id ? statuses.value.find((s) => s.id === id) ?? null : null
  }
  return { statuses, load, byId }
}
```

- [ ] **Step 5: Run the composable test to confirm pass**

Run: `pnpm vitest run app/composables/useLeads.spec.ts`
Expected: PASS, 2 tests.

> `$fetch`/`useState` are Nuxt auto-imports used only inside the returned functions, so the pure `buildLeadsQuery` test does not touch them.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(composables): useLeads + useStatuses"
```

---

## Task 12: UI atoms (TDD)

**Files:**
- Create: `app/components/StatusPill.vue`, `app/components/StatusSelect.vue`, `app/components/CallButton.vue`, `app/components/WhatsAppButton.vue`
- Test: `app/components/CallButton.spec.ts`, `app/components/WhatsAppButton.spec.ts`, `app/components/StatusSelect.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/components/CallButton.spec.ts`:
```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CallButton from './CallButton.vue'

describe('CallButton', () => {
  it('renders a tel: link to the e164 number', () => {
    const w = mount(CallButton, { props: { e164: '+60128975215' } })
    expect(w.get('a').attributes('href')).toBe('tel:+60128975215')
  })
  it('is disabled when there is no valid number', () => {
    const w = mount(CallButton, { props: { e164: null } })
    expect(w.find('a').exists()).toBe(false)
  })
})
```

Create `app/components/WhatsAppButton.spec.ts`:
```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WhatsAppButton from './WhatsAppButton.vue'

describe('WhatsAppButton', () => {
  it('links to wa.me with digits only', () => {
    const w = mount(WhatsAppButton, { props: { e164: '+60128975215' } })
    expect(w.get('a').attributes('href')).toBe('https://wa.me/60128975215')
  })
})
```

Create `app/components/StatusSelect.spec.ts`:
```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusSelect from './StatusSelect.vue'

const statuses = [
  { id: 1, label: 'New', color: '#6b7280', sortOrder: 0 },
  { id: 2, label: 'Callback', color: '#a16207', sortOrder: 1 },
]

describe('StatusSelect', () => {
  it('emits the chosen status id', async () => {
    const w = mount(StatusSelect, { props: { modelValue: 1, statuses } })
    await w.get('select').setValue('2')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([2])
  })
})
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `pnpm vitest run app/components/CallButton.spec.ts app/components/WhatsAppButton.spec.ts app/components/StatusSelect.spec.ts`
Expected: FAIL — components not found.

- [ ] **Step 3: Implement the components**

Create `app/components/CallButton.vue`:
```vue
<script setup lang="ts">
const props = defineProps<{ e164: string | null }>()
async function copyNumber() {
  if (props.e164) await navigator.clipboard?.writeText(props.e164)
}
</script>

<template>
  <a
    v-if="e164"
    :href="`tel:${e164}`"
    class="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
    @click="copyNumber"
  >Call</a>
  <span v-else class="inline-flex items-center rounded-md bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-400">Call</span>
</template>
```

Create `app/components/WhatsAppButton.vue`:
```vue
<script setup lang="ts">
const props = defineProps<{ e164: string | null }>()
const href = computed(() => (props.e164 ? `https://wa.me/${props.e164.replace(/[^\d]/g, '')}` : null))
</script>

<template>
  <a
    v-if="href"
    :href="href"
    target="_blank"
    rel="noopener"
    class="inline-flex items-center rounded-md border border-green-500 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
  >WA</a>
  <span v-else class="inline-flex items-center rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-300">WA</span>
</template>
```

Create `app/components/StatusPill.vue`:
```vue
<script setup lang="ts">
defineProps<{ label: string; color?: string }>()
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :style="{ backgroundColor: (color ?? '#6b7280') + '22', color: color ?? '#6b7280' }"
  >{{ label }}</span>
</template>
```

Create `app/components/StatusSelect.vue`:
```vue
<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
defineProps<{ modelValue: number | null; statuses: StatusRow[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<template>
  <select
    class="rounded-md border border-gray-300 px-2 py-1 text-sm"
    :value="modelValue ?? ''"
    @change="emit('update:modelValue', Number(($event.target as HTMLSelectElement).value))"
  >
    <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
  </select>
</template>
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm vitest run app/components/CallButton.spec.ts app/components/WhatsAppButton.spec.ts app/components/StatusSelect.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): StatusPill, StatusSelect, CallButton, WhatsAppButton atoms"
```

---

## Task 13: Leads table, app shell & lead detail

**Files:**
- Create: `app/layouts/default.vue`, `app/components/FiltersBar.vue`, `app/components/AddLeadModal.vue`, `app/components/LeadDetailPanel.vue`, `app/components/LeadsTable.vue`, `app/pages/index.vue`

- [ ] **Step 1: App shell layout**

Create `app/layouts/default.vue`:
```vue
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
        <div class="text-sm text-gray-500">{{ user?.name }}</div>
        <button class="text-sm text-gray-500 hover:text-gray-900" @click="logout">Log out</button>
      </header>
      <main class="p-6"><slot /></main>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Filters bar**

Create `app/components/FiltersBar.vue`:
```vue
<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
defineProps<{ statuses: StatusRow[] }>()
const search = defineModel<string>('search', { default: '' })
const statusId = defineModel<number | null>('statusId', { default: null })
</script>

<template>
  <div class="mb-4 flex items-center gap-3">
    <input
      v-model="search"
      type="search"
      placeholder="Search name or phone…"
      class="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
    >
    <select
      class="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      :value="statusId ?? ''"
      @change="statusId = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null"
    >
      <option value="">All statuses</option>
      <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
    </select>
  </div>
</template>
```

- [ ] **Step 3: Add-lead modal**

Create `app/components/AddLeadModal.vue`:
```vue
<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'
const props = defineProps<{ statuses: StatusRow[] }>()
const emit = defineEmits<{ created: []; close: [] }>()
const form = reactive({ name: '', phone: '', area: '', statusId: props.statuses[0]?.id ?? null, remarks: '' })
const error = ref('')
const { create } = useLeads()

async function submit() {
  error.value = ''
  try {
    await create({ ...form })
    emit('created')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Could not save the lead'
  }
}
</script>

<template>
  <div class="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
    <div class="w-96 rounded-lg bg-white p-5 shadow-xl">
      <h2 class="mb-3 text-base font-semibold">New lead</h2>
      <div class="space-y-2">
        <input v-model="form.name" placeholder="Name" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm">
        <input v-model="form.phone" placeholder="Phone" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm">
        <input v-model="form.area" placeholder="Area" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm">
        <select v-model.number="form.statusId" class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
          <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
        <textarea v-model="form.remarks" placeholder="Remarks" class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
      </div>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-md px-3 py-1.5 text-sm text-gray-600" @click="emit('close')">Cancel</button>
        <button class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white" @click="submit">Save</button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Lead detail slide-over**

Create `app/components/LeadDetailPanel.vue`:
```vue
<script setup lang="ts">
const props = defineProps<{ leadId: number }>()
const emit = defineEmits<{ close: [] }>()
const { data: lead } = useFetch(`/api/leads/${props.leadId}`, { lazy: true })
const { data: activities } = useFetch(`/api/leads/${props.leadId}/activities`, { lazy: true })
</script>

<template>
  <div class="fixed inset-y-0 right-0 z-10 w-96 overflow-y-auto border-l border-gray-200 bg-white p-5 shadow-xl">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-base font-semibold">{{ lead?.name || 'Lead' }}</h2>
      <button class="text-gray-400 hover:text-gray-700" @click="emit('close')">Close</button>
    </div>
    <dl class="space-y-1 text-sm">
      <div><dt class="text-gray-500">Phone</dt><dd class="font-mono">{{ lead?.phoneE164 || lead?.phoneRaw || '—' }}</dd></div>
      <div><dt class="text-gray-500">Area</dt><dd>{{ lead?.area || '—' }}</dd></div>
      <div><dt class="text-gray-500">Remarks</dt><dd>{{ lead?.remarks || '—' }}</dd></div>
    </dl>
    <h3 class="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Activity</h3>
    <ul class="space-y-1 text-xs text-gray-600">
      <li v-for="a in (activities ?? [])" :key="a.id">{{ a.type }} · {{ new Date(a.createdAt).toLocaleString() }}</li>
    </ul>
  </div>
</template>
```

- [ ] **Step 5: Leads table**

Create `app/components/LeadsTable.vue`:
```vue
<script setup lang="ts">
import type { StatusRow } from '~/composables/useStatuses'

interface LeadRow {
  id: number; name: string; phoneE164: string | null; phoneRaw: string | null
  area: string; statusId: number | null; remarks: string | null
}
defineProps<{ rows: LeadRow[]; statuses: StatusRow[] }>()
const emit = defineEmits<{ open: [id: number]; statusChange: [id: number, statusId: number] }>()
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th class="px-4 py-2 text-left">Name</th>
          <th class="px-4 py-2 text-left">Phone</th>
          <th class="px-4 py-2 text-left">Area</th>
          <th class="px-4 py-2 text-left">Status</th>
          <th class="px-4 py-2 text-right">Contact</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" class="border-t border-gray-100 hover:bg-gray-50">
          <td class="cursor-pointer px-4 py-2 font-medium" @click="emit('open', row.id)">{{ row.name || '—' }}</td>
          <td class="px-4 py-2 font-mono text-gray-700">{{ row.phoneE164 || row.phoneRaw || '—' }}</td>
          <td class="px-4 py-2 text-gray-700">{{ row.area || '—' }}</td>
          <td class="px-4 py-2">
            <StatusSelect
              :model-value="row.statusId"
              :statuses="statuses"
              @update:model-value="(v) => emit('statusChange', row.id, v)"
            />
          </td>
          <td class="px-4 py-2">
            <div class="flex justify-end gap-2">
              <CallButton :e164="row.phoneE164" />
              <WhatsAppButton :e164="row.phoneE164" />
            </div>
          </td>
        </tr>
        <tr v-if="!rows.length"><td colspan="5" class="px-4 py-10 text-center text-gray-400">No leads yet — add one or import your sheet.</td></tr>
      </tbody>
    </table>
  </div>
</template>
```

- [ ] **Step 6: Leads page (wires it all together)**

Create `app/pages/index.vue`:
```vue
<script setup lang="ts">
const { list, update } = useLeads()
const { statuses, load: loadStatuses } = useStatuses()

const search = ref('')
const statusId = ref<number | null>(null)
const openId = ref<number | null>(null)
const showAdd = ref(false)

await loadStatuses()
const { data, refresh } = await useAsyncData('leads', () =>
  list({ page: 1, pageSize: 50, search: search.value || undefined, statusId: statusId.value || undefined }),
  { watch: [search, statusId] },
)

async function onStatusChange(id: number, newStatusId: number) {
  await update(id, { statusId: newStatusId })
  await refresh()
}
async function onCreated() {
  showAdd.value = false
  await refresh()
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold">Leads</h1>
      <button class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white" @click="showAdd = true">+ Add lead</button>
    </div>

    <FiltersBar v-model:search="search" v-model:status-id="statusId" :statuses="statuses" />

    <LeadsTable
      :rows="data?.rows ?? []"
      :statuses="statuses"
      @open="openId = $event"
      @status-change="onStatusChange"
    />

    <LeadDetailPanel v-if="openId" :lead-id="openId" @close="openId = null" />
    <AddLeadModal v-if="showAdd" :statuses="statuses" @created="onCreated" @close="showAdd = false" />
  </div>
</template>
```

- [ ] **Step 7: Type-check**

Run: `pnpm exec nuxi typecheck`
Expected: no errors in `app/`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ui): leads table, app shell, filters, add-lead, detail panel"
```

---

## Task 14: Login + setup pages, seed, and smoke run

**Files:**
- Create: `app/pages/login.vue`, `app/pages/setup.vue`, `server/db/seed.ts`

- [ ] **Step 1: Login page**

Create `app/pages/login.vue`:
```vue
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
```

- [ ] **Step 2: Setup page (first run)**

Create `app/pages/setup.vue`:
```vue
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
```

- [ ] **Step 3: Seed script (dev data using the friend's data shape)**

Create `server/db/seed.ts`:
```ts
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import * as schema from './schema'
import { normalizePhone } from '../../shared/utils/phone'

const SAMPLE = [
  { name: 'Dean Cheong', phone: '60128975215', area: 'Petaling Jaya' },
  { name: 'Evelyn Khoo', phone: '601162085300', area: 'Klang' },
  { name: 'Patrick Ee', phone: '60123498895', area: 'Petaling Jaya' },
  { name: 'Loh Lan', phone: '60162860969', area: 'Shah Alam' },
]

async function main() {
  const pool = mysql.createPool(process.env.DATABASE_URL!)
  const db = drizzle(pool, { schema, mode: 'default' })
  const [ws] = await db.select().from(schema.workspaces).limit(1)
  if (!ws) { console.log('Run first-run setup in the app before seeding.'); process.exit(1) }
  const [firstStatus] = await db.select().from(schema.statuses).where(eq(schema.statuses.workspaceId, ws.id)).limit(1)
  for (const s of SAMPLE) {
    const p = normalizePhone(s.phone)
    await db.insert(schema.leads).values({
      workspaceId: ws.id, name: s.name, area: s.area,
      phoneRaw: p.raw, phoneE164: p.e164, phoneValid: p.valid,
      statusId: firstStatus?.id ?? null, source: 'manual',
    })
  }
  console.log(`Seeded ${SAMPLE.length} leads into workspace ${ws.id}`)
  await pool.end()
}
main()
```
Run `pnpm add -D dotenv` so the seed script can read `.env`.

- [ ] **Step 4: Run the full unit suite**

Run: `pnpm test:run`
Expected: PASS — all spec files green (smoke, schema, phone, lead schema, visibility, defaults, session-payload, context, leads.repo, useLeads, CallButton, WhatsAppButton, StatusSelect).

- [ ] **Step 5: Manual smoke run (requires a local MySQL database)**

```bash
# create .env from the example and fill DATABASE_URL + NUXT_SESSION_PASSWORD
cp .env.example .env
# create the database in MySQL: CREATE DATABASE crm; (and a user matching DATABASE_URL)
pnpm db:migrate
pnpm dev
```
Then in the browser at `http://localhost:3000`:
1. You are redirected to `/setup`. Create the owner + workspace.
2. You land on `/` (Leads), empty.
3. Click `+ Add lead`, save "Dean Cheong" / `60128975215` / "Petaling Jaya". The row appears with a working **Call** (`tel:+60128975215`) and **WA** (`wa.me/60128975215`) button.
4. Change the row's status inline — it persists across refresh.
5. Click the name — the detail panel shows the lead and a `created` activity.
6. Log out → redirected to `/login` → log back in.

Expected: all six steps work. (Optional: stop dev, run `pnpm db:seed` to load the four sample leads, restart.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): login + first-run setup pages, dev seed; foundation complete"
```

---

## Deferred within Phase 1 (picked up by later plans, not silently dropped)

These spec features are intentionally NOT in this foundation plan:
- Inline **remarks** editing in the table, **column sort** controls, **area / assigned-agent / follow-up-due** filters, **pagination controls**, and **bulk** select → assign/status/delete. (Table polish — added across Plans 2–5; the repo + list API already support pagination, sort, and the filters.)
- Logging a `call` / `whatsapp` **activity on button click**, plus the post-call "How'd it go?" **status prompt**. (Lands with the quick-status UX in Plan 3; the `activities` table + `logActivity` already exist.)
- **Optional-field toggles**, the **status editor**, and **area-list** management. (Plan 4 — Settings.)
- **Agent accounts, invites, reassignment** UI. (Plan 5 — Members; the `invites` table + roles already exist.)

## Done criteria

- `pnpm test:run` is green.
- A fresh clone with a MySQL database can: run setup, log in, add/edit leads, change status inline, click Call/WhatsApp, view the detail panel + activity log, and log out.
- Owner/agent visibility is enforced by `leadVisibilityScope` (unit-tested) and applied in every leads query via `buildLeadWhereParts`.
- Ready for Plan 2 (Import wizard) to layer on top.
