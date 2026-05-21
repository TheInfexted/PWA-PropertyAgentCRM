# Property Agent CRM — Phase 1: CRM Core (Design Spec)

- **Date:** 2026-05-21
- **Status:** Approved for planning
- **Author:** Brendan (with Claude)

---

## 1. Context

A property agent (the friend) currently tracks leads in a Google Sheet with five columns: `Name · Contact · Area · Status · Remarks`. Their daily job is to work down a call list: tap a number, call or WhatsApp, mark the outcome (`No Answer`, `Busy`, etc.), jot a remark, move on. A separate system already auto-fills new lead rows so they can call faster.

The Excel method works today, but they are open to something more convenient. The long-term vision also includes auto-capturing leads from multiple channels and an AI auto-reply bot. This spec covers **only the CRM Core** — the foundation that must beat Excel on its own before anything else is built on top.

### The three-layer decomposition

The full vision is three stacked subsystems, each depending on the one below:

1. **CRM Core** (this spec) — lead/client tracking, call list, follow-ups. Delivers value standalone.
2. **Lead Ingestion** (future) — auto-capture from WhatsApp, property portals, Meta lead ads. Feeds records into the Core.
3. **AI Auto-Reply Bot** (future) — sits on the messaging integrations from layer 2.

You cannot sensibly build layer 3 before 2, or 2 before 1. We build and validate the Core first.

---

## 2. Goals & success criteria

The Core succeeds if it is **faster and safer than the spreadsheet**:

- The friend can import their existing sheet in under five minutes (paste or CSV).
- They can filter to a worklist and call/WhatsApp any lead in one click.
- They never miss a callback — a "Due Today" view surfaces overdue follow-ups (the single biggest thing Excel does badly).
- Phone numbers are cleaned and de-duplicated automatically.
- In team mode, an Owner can invite an Agent who then sees only their own assigned leads.

### Explicitly out of scope (deferred)

- Lead auto-capture / channel integrations (Phase 2).
- AI auto-reply bot (Phase 3).
- Offline-first data sync.
- Realtime live-updating tables (easy to add later).
- Focus / Power-Call mode (validated as desirable, but a fast-follow after the Table ships).
- Public self-service sign-up, billing, multi-company SaaS.

---

## 3. Users & roles

The product is built around a **Workspace**. Personal use is simply a workspace with one member. Team use is the same thing with more people invited.

- **Owner** — full control (settings, members, all leads). The solo agent, or the agency manager.
- **Agent** — sees and works only the leads assigned to them.

**Visibility rule:** Owner sees all leads in the workspace; Agent sees only leads where `assigned_to = self`. This is enforced in the API data-access layer, not just the UI (see §6.4).

**Onboarding:** No public sign-up. On first run, a setup screen creates the initial Owner + workspace. Thereafter the Owner invites Agents via an invite link / temporary password — so **no email/SMTP infrastructure is required on day one**.

---

## 4. Functional design

### 4.1 The lead record — tiny core that can grow

**Core fields (always on — mirrors their sheet):**

| Field | Notes |
|---|---|
| Name | |
| Phone | Stored normalized (`+60…`) plus the raw input; invalid numbers flagged |
| Area | Free text with autocomplete suggestions from the workspace area list; messy values are gently standardized, never blocked |
| Status | From the workspace's configurable status list (§4.2) |
| Remarks | Free text |

**Always available (not a default table column):** Next follow-up date. It is part of the core value (it powers the Due Today view and the "schedule callback" quick action), but it is set from the lead detail panel / a quick action rather than cluttering the five-column table. So the friend keeps their five columns while still never missing a callback.

**Optional fields (off by default; toggled per workspace in Settings):**

Email · Intent (buy/rent/sell/invest) · Property type · Budget (min–max) · Tags.

This keeps the friend's view at exactly five columns, while a pickier agency can switch on extras with no rebuild. It is also what keeps a future multi-company product path open without building it now.

### 4.2 Status — configurable list, not a fixed pipeline

Status is an editable per-workspace list (rename, add, remove, reorder, color) rather than a hard-coded sales funnel. Defaults, matching the friend's sheet:

`New · No Answer · Busy · Spoke – Interested · Spoke – Not Interested · Callback · Closed – Won · Closed – Lost`

### 4.3 Screens

App shell: left sidebar nav + top bar (global search, `+ Add lead`, workspace switcher shown only if the user belongs to more than one).

1. **Leads — the Table (home).** The validated primary layout. Columns = core fields + any enabled optional fields. Search by name/phone; filters (status, area, assigned agent, "follow-up due"); sort any column; inline-edit status + remarks; per-row Call / WhatsApp; bulk select → assign / change status / delete (useful right after an import). Server-side pagination.
2. **Lead detail** — slides in from the right (does not lose place in the list). Full record, all notes, the activity log, follow-up date picker, assign-to-agent.
3. **Follow-ups / Due Today** — leads with a callback due today or overdue, oldest first. Call/WA, then mark done or reschedule.
4. **Import** — paste from a spreadsheet or upload CSV → map columns → preview (phone clean-up + duplicate flags + per-row errors) → confirm. Migrates the real list on day one.
5. **Settings** — edit the status list, toggle optional fields, manage the area list, workspace name.
6. **Members** (team only; Owner) — invite by email/link, set role, view & reassign each agent's leads.
7. **Auth** — first-run setup (create Owner + workspace) and login (email/password).

### 4.4 Call & WhatsApp behavior

- **Call** — on desktop, opens a `tel:` link and copies the number, then prompts a small "How'd it go?" status picker so the outcome is logged. On the mobile PWA it dials directly.
- **WhatsApp** — opens `wa.me/<e164>` with the chat ready.
- Either action writes an **activity** record (call/whatsapp), building the history Excel never kept.

### 4.5 Activity log

Append-only per lead. Records: `created`, `call`, `whatsapp`, `status_change`, `note`, `assigned`, `imported` — with actor and timestamp.

---

## 5. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Nuxt 4 (Vue 3 + TypeScript), Tailwind CSS v4 |
| Server | Nuxt Nitro (Node) API routes |
| Database | MySQL/MariaDB (CloudPanel-managed) |
| ORM / migrations | Drizzle ORM |
| Auth | `nuxt-auth-utils` — email/password, encrypted session cookies (no Google OAuth) |
| PWA | `@vite-pwa/nuxt` (installable + app-shell caching) |
| Validation | `zod` (shared client + server) |
| Phone | `libphonenumber-js` (default region MY) |
| Hosting | Self-hosted on Hostinger VPS via CloudPanel |

Conventions mirror the existing FN-ClientZone project: Vitest with `happy-dom`, tests match `**/*.spec.ts`, path alias `@` → `/app`.

---

## 6. Architecture

### 6.1 Data flow

Vue components → composables (`useLeads`, `useWorkspace`, `useFollowUps`, `useStatuses`) → Nitro API routes (`/api/leads`, `/api/import`, `/api/auth/*`, `/api/statuses`, `/api/members`) → repository layer → Drizzle → MySQL.

Every lead query passes through a single scoping guard (§6.4). Nothing queries leads around it.

### 6.2 Database schema (key tables)

- **users** — `id, email (unique), password_hash, name, created_at`
- **workspaces** — `id, name, settings (JSON: enabledOptionalFields[], areas[]), created_at`
- **workspace_members** — `id, workspace_id, user_id, role ENUM('owner','agent'), created_at`, unique `(workspace_id, user_id)`
- **invites** — `id, workspace_id, email, role, token, expires_at, accepted_at, created_at`
- **statuses** — `id, workspace_id, label, color, sort_order, created_at`
- **leads** — `id, workspace_id, name, phone_e164, phone_raw, phone_valid, area, status_id, remarks, assigned_to, source ENUM('manual','import','whatsapp','propertyguru','iproperty','facebook','referral','walkin') [Phase 1 only produces 'manual'/'import'], email, intent, property_type, budget_min, budget_max, next_follow_up_at, tags (JSON), created_by, created_at, updated_at`
- **activities** — `id, workspace_id, lead_id, type ENUM('created','call','whatsapp','status_change','note','assigned','imported'), detail (JSON), actor_user_id, created_at`

**Indexes:** leads `(workspace_id, status_id)`, `(workspace_id, assigned_to)`, `(workspace_id, next_follow_up_at)`, `(workspace_id, phone_e164)`; activities `(workspace_id, lead_id, created_at)`.

MySQL has no arrays/RLS, so `tags` and `settings` use JSON columns and visibility is enforced in the app layer (§6.4).

### 6.3 Auth

`nuxt-auth-utils` for encrypted-cookie sessions and built-in password hashing. First-run setup screen creates the initial Owner + workspace when no users exist. Subsequent accounts are invite-only (token link sets the password). A global auth middleware redirects unauthenticated users to login/setup.

### 6.4 The visibility guard (security choke-point)

A single server util builds every scoped lead query:

```
scopedLeads(ctx):
  base = where workspace_id = ctx.workspaceId
  if ctx.role == 'agent':
    base += and assigned_to = ctx.userId
  return base
```

All lead repository functions use it. Role and workspace come from the validated session, never from client input. This is the entire visibility rule, in one place.

### 6.5 Phone normalization & dedupe

On entry and on import, numbers are normalized to E.164 via `libphonenumber-js` (region MY), storing both `phone_e164` and `phone_raw`, flagging invalids. Duplicate detection matches `phone_e164` within the workspace — warn on manual create, flag in the import preview.

### 6.6 Import pipeline

Nitro route accepts pasted TSV/CSV text or an uploaded file → parse → user maps columns to fields → server normalizes phones, validates, detects dupes → returns a preview (valid rows, error rows with reasons, dupe matches) → on confirm, bulk insert with `source = 'import'` and an `imported` activity per lead. Bad rows surface their reason and never block the good rows.

### 6.7 Project layout (Nuxt 4, `app/` srcDir)

- `app/pages/` — leads (index), follow-ups, import, settings, members, login, setup
- `app/components/` — `LeadsTable`, `LeadRow`, `LeadDetailPanel`, `StatusSelect`, `StatusPill`, `CallButton`, `WhatsAppButton`, `ImportWizard`, `FiltersBar`
- `app/composables/` — `useLeads`, `useWorkspace`, `useFollowUps`, `useStatuses`
- `app/middleware/` — `auth.global.ts`
- `shared/` — zod schemas, phone util, shared types
- `server/api/` — `auth/`, `leads`, `leads/[id]`, `import`, `statuses`, `members`, `invites`
- `server/utils/` — Drizzle client, session/auth helpers, `scopedLeads` guard, repositories
- `server/db/` — Drizzle `schema.ts` + migrations

### 6.8 Deployment (CloudPanel / Hostinger)

1. Point a subdomain (e.g. `crm.<domain>`) at the VPS.
2. CloudPanel → Add Site → Node.js (auto Nginx reverse proxy + Let's Encrypt SSL).
3. `nuxi build` → run `.output/server/index.mjs` as the site process (port + env vars in the panel).
4. CloudPanel → Databases → create the MySQL database (managed UI + backups).
5. Env: DB connection, `NUXT_SESSION_PASSWORD`, app URL.
6. Deploy loop: `git pull` → `pnpm install && pnpm build` → restart the site.

---

## 7. Validation & error handling

- Shared zod schemas validate client and server; a lead requires at least a name or a phone.
- API returns typed errors → inline toasts in the UI.
- Inline table edits are optimistic with rollback on failure.
- Import preview reports per-row problems without discarding valid rows.

---

## 8. Testing strategy

Vitest (happy-dom; `**/*.spec.ts`; `@` → `/app`):

- **Unit:** phone normalization, dedupe matching, the `scopedLeads` visibility guard (owner vs agent), import column-mapping/parsing, zod schemas.
- **Component:** leads table render + inline status edit + filters; import preview.
- **Integration:** auth/session flow; leads CRUD enforcing role visibility; the import endpoint end to end.
- A dev seed script loads sample leads (using the friend's anonymized data shape) for local work.

---

## 9. Performance

Server-side pagination on the leads table. Indexes per §6.2. JSON columns kept small (tags, settings only).

---

## 10. Appendix — future phases (captured, not in scope)

### Lead ingestion feasibility (Phase 2)

| Channel | Realistic path | Difficulty |
|---|---|---|
| Phone / manual | Entry form + CSV import (in Core) | Trivial |
| Facebook / Instagram | Official Meta Lead Ads API + webhooks | Easy-ish |
| WhatsApp | Official WhatsApp Business Cloud API (takes over the number, per-conversation cost, approval). Unofficial WhatsApp-Web automation violates ToS / risks bans | Medium |
| PropertyGuru / iProperty | No open public API; pragmatic route is parsing portal enquiry-notification emails to a dedicated inbox. Partner API access is gated | Hardest |

The `source` field and the activity log are already in the Core schema so ingested leads slot in with no schema change.

### AI auto-reply bot (Phase 3)

Builds on the WhatsApp/Messenger integration from Phase 2. Recommended to start as "AI drafts, agent approves" before any full auto-send, with a workspace FAQ/knowledge base and a human-handoff path.
