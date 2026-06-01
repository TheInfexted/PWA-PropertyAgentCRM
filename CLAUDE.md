# CLAUDE.md — Property CRM

A warm, dependable call-list CRM for property agents (solo agent or small team). Nuxt 4 (Vue 3 + TS) + Tailwind v4 + MySQL/MariaDB via Drizzle + `nuxt-auth-utils`. Self-hosted on Hostinger via CloudPanel (Node.js site + managed MySQL).

## Commands
- `pnpm dev` — dev server (localhost:3000)
- `pnpm build` — production build (`.output/server/index.mjs`)
- `pnpm test:run` — Vitest, single run
- `pnpm exec nuxi typecheck` — type-check (keep at 0 errors)
- `pnpm db:migrate` — apply Drizzle migrations
- `pnpm db:seed` — load sample leads (after first-run setup)

## Design Context (read before ANY UI or copy work)
`PRODUCT.md` and `DESIGN.md` at the project root are normative. Read them first.
- **Register:** product (app UI serving the daily worklist).
- **Brand:** "The Daylight Ledger" — warm, clear, dependable. "Warm but precise." Anti-references: generic SaaS template, cluttered enterprise CRM, playful/consumer app, flashy marketing site.
- **Visual system:** one terracotta accent (`#9e5733`, actions/state only), warm paper neutrals in OKLCH (never `#000`/`#fff`/cool grays), Geist + Geist Mono (tabular numbers), soft radii (8–20px), warm-tinted shadows, WCAG AA, status never conveyed by color alone.

If you edit `PRODUCT.md` or `DESIGN.md`, re-run:
`node /Users/brendxn___/.claude/plugins/cache/impeccable/impeccable/3.0.5/skills/impeccable/scripts/load-context.mjs`

## Architecture notes
- `app/` = Nuxt srcDir (pages, components, composables, `middleware/auth.global.ts`). `server/` = Nitro API + Drizzle (`server/db/schema.ts`, `server/utils/*.repo.ts`). `shared/` = zod schemas, phone util, types.
- **Visibility rule** (owner sees all / agent sees only their own): lives in `shared/utils/visibility.ts` + `server/utils/leads.repo.ts` (`buildLeadWhereParts`). Every lead query must route through it; only owners may set `assignedTo`.
- **SSR auth gotcha:** authed internal fetches on SSR pages must use `useRequestFetch()`, not bare `$fetch` (bare `$fetch` does not forward the session cookie during SSR → 401).
- Specs and plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`.

## Deploy (CloudPanel / Hostinger)
`git pull && pnpm install && pnpm db:migrate && pnpm build && pm2 restart crm-demo`. The app runs under PM2 on the CloudPanel App Port with `--node-args="--env-file=.env"`. Full steps in the spec, §6.8.

## Environment note
This project lives under `~/Desktop/` (iCloud-synced), which spawns `" 2"` conflict copies. `.gitignore` excludes them; consider moving the repo to a non-synced folder.
