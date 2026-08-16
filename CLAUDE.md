# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Pauperwave — a Magic: The Gathering Pauper League Manager dashboard. Nuxt 4 + Vue 3 + TypeScript, using Nuxt UI (Tailwind-based), Supabase (Postgres + Auth), and Nitro server routes. UI copy and route labels are in Italian; the codebase (identifiers, comments) is in English.

## Commands

```bash
pnpm dev              # dev server at http://localhost:3000
pnpm build            # production build
pnpm preview          # preview production build
pnpm lint             # eslint .
pnpm typecheck        # nuxt typecheck (vue-tsc)
pnpm check:paths      # verify every app/server/shared source file has a correct path header
pnpm check:paths:fix  # insert/correct those headers in place
pnpm test             # vitest run
pnpm test:watch       # vitest --watch
pnpm test:coverage    # vitest run --coverage
pnpm test:e2e         # playwright test
pnpm test:e2e:headed  # playwright test, headed + slowed down
pnpm supabase:types   # regenerate shared/utils/types/database.ts from the Supabase schema
pnpm fallow:health    # fallow health --score --hotspots --targets
pnpm fallow:dead-code # fallow dead-code
pnpm fallow:dupes     # fallow dupes
pnpm fallow:audit     # fallow audit
pnpm fallow:security  # fallow security
```

vitest and Playwright are configured (mirroring `MagicTheGathering/league`), but no tests exist yet — see `test/README.md` and `test/e2e/README.md`. Always run `pnpm lint` and `pnpm typecheck` after changes; both must be clean (see the zero-warning policy in global CLAUDE.md).

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

`app/components/inputs` and `app/components/ui` are registered in `nuxt.config.ts` with `pathPrefix: false`, so components there are auto-imported *without* a folder prefix (e.g. `<TaxCodeInput>`, not `<InputsTaxCodeInput>`; `<ConfirmModal>`, not `<UiConfirmModal>`). `ui/` is for generic, single-purpose primitives whose names are already unique (`AddButton`, `ConfirmModal`, `StatusFilterGroup`, ...) — domain folders (`tournaments/`, `locations/`, ...) keep the default prefixed behavior on purpose, since `AddModal.vue`/`GridView.vue`/etc. repeat by design across domains and need the prefix to stay distinguishable.

### Auth
Supabase magic-link (OTP) auth via `@nuxtjs/supabase`:
1. `login.vue` posts to `server/api/check-associate.post.ts` to verify the email exists in `pauperwave_associates` before calling `supabase.auth.signInWithOtp`.
2. `app/middleware/auth.global.ts` is a global route middleware — it redirects unauthenticated users to `/login` and keeps a hardcoded public-page allowlist (`/login`, `/auth/callback`, `/logout`) that must be updated whenever a new unauthenticated route is added.
3. `auth/callback.vue` completes the Supabase session exchange.

`nuxt.config.ts` also configures `@nuxtjs/supabase`'s own `redirectOptions`/`exclude` — when adding public routes, keep that list and the middleware's `publicPages` array in sync.

### Data fetching
Two patterns coexist during the migration to Pinia Colada + BFF (ADR-007, `docs/PROGRESS.md`):
- **New/migrated domains** (e.g. `wanted-cards`, `associates`): `use<Domain>Query.ts` (`useQuery` from Pinia Colada, reads Supabase directly with the anon client) + `use<Domain>Mutations.ts` (`useMutation`, calls a `server/api/<domain>/*.post.ts` BFF endpoint via `$fetch`, never Supabase directly from the client). Use `app/composables/wantedCards/useWantedCards{Query,Mutations}.ts` as the template for new domains.
- **Not yet migrated** (`cittadino`, `events`, `leagues`, `standings`, `tournaments`): `useAsyncData` + `useSupabaseClient()`, `lazy: true`, an explicit `default: () => []`, Supabase errors rethrown via `createError`. Being phased out — see `docs/BACKLOG.md`.

Some `server/api/*` endpoints (`tournaments.ts`, `leagues.ts`, `members.ts`, `notifications.ts`) still return mock/static data rather than querying Supabase — check an endpoint's implementation before assuming it's backed by the database.

### Render functions (`h()`) in composables, not just `.vue` files
`resolveComponent('UButton')` only resolves reliably inside a `.vue` file's `<script setup>` — the compiler rewrites it there. Called from a plain `.ts` composable (e.g. a `use<Domain>TableColumns.ts` building `TableColumn` defs with `h()`), it silently fails ("Failed to resolve component" warnings) and can hang the page instead of just rendering broken markup. Import the component directly from `#components` instead: `import { UButton } from '#components'`. Confirmed 2026-08-08 while extracting `useWantedCardsTableColumns.ts` out of `wanted-cards/index.vue`.

### Auto-imports: an export right after an array-literal `export const` gets dropped
In an `app/utils/*.ts` file, the export declared immediately after an `export const X = [...]` is silently omitted from Nuxt's generated auto-imports (`.nuxt/imports.d.ts`), while every other export in the same file is picked up. It fails quietly — the symbol simply never becomes globally available, surfacing only as `TS2304: Cannot find name` at `pnpm typecheck`, or a runtime `ReferenceError` if typecheck is skipped.

Confirmed 2026-08-09 in `app/utils/cittadinoPoints.ts`: `CITTADINO_MIN_POINTS`, declared right after `CITTADINO_POINTS_BY_RANK = [25, 18, …]`, was the only one of five exports missing. Renaming it changed nothing; moving it *above* the array export fixed it and restored all five. Blank lines between declarations make no difference.

Workaround: declare scalar exports before array-literal ones, or import the symbol explicitly. Worth checking with `grep "export {" .nuxt/imports.d.ts` when adding constants to a utils file that also exports an array — and this is one concrete reason `pnpm typecheck` must actually be run rather than assumed.

### Types
Shared domain types (`Associate`, `Tournament`, `Transaction`, status unions, etc.) live in `app/types/index.d.ts`. Add new domain interfaces there rather than colocating them in components.

### Config conventions
- `nuxt.config.ts` pre-bundles `zod` via Vite `optimizeDeps` for faster dev-server startup — keep this if zod imports change.
- ESLint stylistic rules: no dangling commas, 1tbs brace style, max 3 attrs/line (single-line) or 1/line (multi-line) on Vue templates, `vue/no-multiple-template-root` disabled.
- Props: per global convention, use `defineProps<Props>()` with inline destructured defaults, not `withDefaults`.
