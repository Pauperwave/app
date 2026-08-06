# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PauperWave — a Magic: The Gathering Pauper League Manager dashboard. Nuxt 4 + Vue 3 + TypeScript, using Nuxt UI (Tailwind-based), Supabase (Postgres + Auth), and Nitro server routes. UI copy and route labels are in Italian; the codebase (identifiers, comments) is in English.

## Commands

```bash
pnpm dev         # dev server at http://localhost:3000
pnpm build       # production build
pnpm preview     # preview production build
pnpm lint             # eslint .
pnpm typecheck        # nuxt typecheck (vue-tsc)
pnpm check:paths      # verify every app/server/shared source file has a correct path header
pnpm check:paths:fix  # insert/correct those headers in place
```

There is no test runner configured in this repo. Always run `pnpm lint` and `pnpm typecheck` after changes; both must be clean (see the zero-warning policy in global CLAUDE.md).

Add a path comment as the first line of every source file under `app/`, `server/`, `shared/`, `test/`, `scripts/`: `<!-- app\components\X.vue -->` or `// app\stores\x.ts` (backslash-separated, matching the checker in `scripts/check-file-paths.mjs`, copied unmodified from `MagicTheGathering/league`). Skips `shared/utils/types/database.ts` (generated via `pnpm supabase:types`, never hand-edited).

## Architecture

### Routing & pages
File-based routing under `app/pages`, grouped with Nuxt route groups (parens don't affect the URL):
- `(analytics)/statistics` — stats & deck analytics
- `(community)/associates`, `(community)/transactions` — members & finances
- `(competitions)/tournaments`, `(competitions)/leagues`, `(competitions)/events` — nested: leagues and events both contain tournaments (`leagues/[leagueId]/tournaments/[tournamentId]`, `events/[eventId]/tournaments/[tournamentId]`)
- `(settings)/settings` — general/members/notifications/security tabs
- `auth/callback.vue`, `login.vue` — auth flow pages (use the `auth` layout, not `default`)

Two layouts: `default.vue` (sidebar + navbar + toolbar dashboard shell) and `auth.vue` (centered, for login/callback).

### Components
Feature-based organization under `app/components/<domain>/`, mirroring the page domains (`associates`, `tournaments`, `leagues`, `events`, `transactions`, `home`, `settings`). Within a domain, `list/` holds list-view + CRUD modal components, `single/` holds detail-view components.

`app/components/inputs` is registered in `nuxt.config.ts` with `pathPrefix: false`, so components there are auto-imported *without* an `Inputs` prefix (e.g. `<TaxCodeInput>`, not `<InputsTaxCodeInput>`). All other component directories keep the default prefixed auto-import behavior.

### Auth
Supabase magic-link (OTP) auth via `@nuxtjs/supabase`:
1. `login.vue` posts to `server/api/check-associate.post.ts` to verify the email exists in `pauperwave_associates` before calling `supabase.auth.signInWithOtp`.
2. `app/middleware/auth.global.ts` is a global route middleware — it redirects unauthenticated users to `/login` and keeps a hardcoded public-page allowlist (`/login`, `/auth/callback`, `/logout`) that must be updated whenever a new unauthenticated route is added.
3. `auth/callback.vue` completes the Supabase session exchange.

`nuxt.config.ts` also configures `@nuxtjs/supabase`'s own `redirectOptions`/`exclude` — when adding public routes, keep that list and the middleware's `publicPages` array in sync.

### Data fetching
No Pinia/state library — shared reactive state lives in composables (`app/composables/`), following the `useAssociates.ts` pattern: `useAsyncData` + `useSupabaseClient()`, `lazy: true`, an explicit `default: () => []`, and Supabase errors rethrown via `createError`. Add new domain data-fetchers the same way rather than introducing a store.

Some `server/api/*` endpoints (`tournaments.ts`, `leagues.ts`, `members.ts`, `notifications.ts`) still return mock/static data rather than querying Supabase — check an endpoint's implementation before assuming it's backed by the database.

### Types
Shared domain types (`Associate`, `Tournament`, `Transaction`, status unions, etc.) live in `app/types/index.d.ts`. Add new domain interfaces there rather than colocating them in components.

### Config conventions
- `nuxt.config.ts` pre-bundles `zod` via Vite `optimizeDeps` for faster dev-server startup — keep this if zod imports change.
- ESLint stylistic rules: no dangling commas, 1tbs brace style, max 3 attrs/line (single-line) or 1/line (multi-line) on Vue templates, `vue/no-multiple-template-root` disabled.
- Props: per global convention, use `defineProps<Props>()` with inline destructured defaults, not `withDefaults`.
