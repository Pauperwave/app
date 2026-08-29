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
- `(competitions)/tournaments`, `(competitions)/leagues`, `(competitions)/events` — all flat (`tournaments/[tournamentId]`, not nested under leagues/events): a tournament's parent league/event is optional and polymorphic, so its canonical URL stays flat, with a `?from=league:<uuid>` query param (`app/utils/tournaments/tournamentOrigin.ts`) carrying "came from this league" for a back-link the route params alone can't express
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
- **New/migrated domains** (e.g. `wanted-cards`, `associates`, `events`, `leagues`, `tournaments`): `use<Domain>Query.ts` (`useQuery` from Pinia Colada, reads Supabase directly with the anon client) + `use<Domain>Mutations.ts` (`useMutation`, calls a `server/api/<domain>/*.post.ts` BFF endpoint via `$fetch`, never Supabase directly from the client). Use `app/composables/wantedCards/useWantedCards{Query,Mutations}.ts` as the template for new domains.
- **Not yet migrated** (`cittadino`, `standings`): still backed by mock data — `server/api/cittadino.ts` and `server/api/standings/[format].get.ts` return static placements, no `tournament_standings`-equivalent table exists yet ([issue #2](https://github.com/Pauperwave/app/issues/2)). Their composables fetch from these endpoints rather than reading Supabase directly.

`server/api/members.ts` and `server/api/notifications.ts` also still return mock/static data (roster/notification scaffolding, no backing table) — check an endpoint's implementation before assuming it's backed by the database.

### PostgREST silently caps every unranged query at db.max_rows (1000)
This project's PostgREST (`db.max_rows`, raised from 250 to 1000 on 2026-08-29) truncates any `.select()` without an explicit `.range()` to that limit — it returns HTTP 206 (Partial Content) with the truncated data, not an error, so nothing in the app surfaces it. A `use<Domain>Query.ts` written as a plain unranged select works fine while the table is small, then silently starts dropping rows once it crosses the limit — no code change, no deploy, just organic data growth.

Confirmed twice at the old 250-row cap: `pauperwave_payments` (2026-08-23, the 2026 historical import pushed it past 250) and `pauperwave_associates`/`pauperwave_associate_renewals` (2026-08-26, the latter tipped over during a routine renewal-data backfill mid-session — a `/statistics` chart started showing numbers that didn't match direct SQL, with `data.length` silently 250 short of the real Postgres row count). Raising `db.max_rows` to 1000 only moves this cliff further out, it doesn't remove it — checked 2026-08-29 against live row counts: `pauperwave_payments` was already at 703 rows (grew past 250 in a few months), so it's on track to hit 1000 again eventually. The real fix stays `fetchAllRows`, not a bigger cap.

Fix: use the shared `fetchAllRows` helper (`app/utils/query/fetchAllRows.ts`) instead of a bare `.select()` in any `use<Domain>Query.ts` — pass it a `(from, to) => ...range(from, to)` page-fetcher and it pages through until a page comes back short. Already applied in `useTransactionsQuery.ts`, `useAssociatesQuery.ts`, `useAssociateRenewalsQuery.ts`. When adding a new `use<Domain>Query.ts` or reviewing an existing one, use this helper by default rather than a bare `.select()` — don't wait for a table to cross the limit to find out the hard way. Its own `pageSize` constant must stay `<= db.max_rows` or the same silent-truncation bug reappears one level down — keep it in sync if `db.max_rows` changes again.

### Nuxt UI `:ui` overrides don't cancel a differently-scoped default class
Nuxt UI components merge their own default classes with a caller's `:ui` prop via `tailwind-merge`, which only collapses two classes that share the exact same utility+variant signature. An override like `header: 'p-0'` does **not** cancel a component default like `sm:px-6` — different signature (unprefixed vs. `sm:`-scoped) — so the default's padding silently reappears at that breakpoint even though the override looks like it should have stripped all padding.

Confirmed 2026-08-29 in `DetailSlideover.vue`'s `USlideover`: `:ui="{ header: 'p-0 min-h-0' }"` was meant to make the hero image sit edge-to-edge, but `SlideoverHeader`'s own default `sm:px-6` survived at `sm:` and up, leaving visible gaps on both sides of the image ("black bands" bug report). Two guessed fixes (toggling `inset` responsively, then a negative margin on the hero) were wrong before inspecting the actual computed styles (`getComputedStyle`/`getBoundingClientRect` via the browser, not just reading source) revealed the real cause.

Fix: match the *exact* signature of the default class you're trying to cancel — here, `header: 'p-0 sm:px-0 min-h-0'`. When an `:ui` override doesn't seem to be taking effect at some breakpoint, check the component's own default `ui` config (in `node_modules/@nuxt/ui`) for a differently-scoped class first, rather than reaching for a margin/positioning workaround.

### Render functions (`h()`) in composables, not just `.vue` files
`resolveComponent('UButton')` only resolves reliably inside a `.vue` file's `<script setup>` — the compiler rewrites it there. Called from a plain `.ts` composable (e.g. a `use<Domain>TableColumns.ts` building `TableColumn` defs with `h()`), it silently fails ("Failed to resolve component" warnings) and can hang the page instead of just rendering broken markup. Import the component directly from `#components` instead: `import { UButton } from '#components'`. Confirmed 2026-08-08 while extracting `useWantedCardsTableColumns.ts` out of `wanted-cards/index.vue`.

### Auto-imports: an export right after an array-literal `export const` gets dropped
In an `app/utils/*.ts` file, the export declared immediately after an `export const X = [...]` is silently omitted from Nuxt's generated auto-imports (`.nuxt/imports.d.ts`), while every other export in the same file is picked up. It fails quietly — the symbol simply never becomes globally available, surfacing only as `TS2304: Cannot find name` at `pnpm typecheck`, or a runtime `ReferenceError` if typecheck is skipped.

Confirmed 2026-08-09 in `app/utils/cittadino/cittadinoPoints.ts`: `CITTADINO_MIN_POINTS`, declared right after `CITTADINO_POINTS_BY_RANK = [25, 18, …]`, was the only one of five exports missing. Renaming it changed nothing; moving it *above* the array export fixed it and restored all five. Blank lines between declarations make no difference.

Workaround: declare scalar exports before array-literal ones, or import the symbol explicitly. Worth checking with `grep "export {" .nuxt/imports.d.ts` when adding constants to a utils file that also exports an array — and this is one concrete reason `pnpm typecheck` must actually be run rather than assumed.

Related failure mode confirmed 2026-08-29 in `app/utils/wantedCards/wantedCardLanguages.ts`: the file itself (which exports an array-literal `WANTED_CARD_LANGUAGES = [...] as const`) failed to resolve the *incoming* auto-import of `ICONS` (from `app/utils/icons.ts`) when referenced inside its own `WANTED_CARD_LANGUAGE_ICONS` object — `TS2304: Cannot find name 'ICONS'`, reproducible across repeated `pnpm typecheck` runs. So the array-literal-export fragility can affect a file's own *inbound* auto-imports too, not just its outbound exports. Fix: add an explicit `import { ICONS } from '~/utils/icons'` rather than relying on auto-import.

### Icons
`app/utils/icons.ts`'s `ICONS` constant is the single source of truth for *every* icon string literal used anywhere in the app (`i-lucide-*`, `i-simple-icons-*`, `i-circle-flags-*`), including single-use ones — not just duplicated icons. Before adding a raw `'i-lucide-...'` string anywhere, check `ICONS` for an existing entry to reuse, and add a new one there rather than leaving the literal inline. Enforced repo-wide as of 2026-08-29 (a sweep centralized every remaining raw literal, including a project convention that this applies even to icons used exactly once — dedup-identical-only doesn't apply to this file).

### Shared row-actions composables
Table/grid "right-click context menu" wiring has three small shared composables in `app/composables/`, extracted after the same code was independently duplicated across multiple `use<Domain>RowActions.ts`/`use<Domain>ContextMenu.ts` files:
- **`useRowContextMenu.ts`** — tracks the right-clicked row (`contextMenuRow`/`onRowContextmenu`) and recomputes `tableContextMenuItems` from a domain's own `rowContextMenuItems(item)` builder function.
- **`useCopyToClipboard.ts`** — clipboard-write-with-toast helper (generic `common.copyErrorTitle` on failure).
- **`useSelectedTableRows.ts`** — resolves the current selection against a table's *filtered* row model (not the raw data array), so a selection hidden by an active column filter isn't actionable.

Use these instead of hand-rolling the same trio again in a new `use<Domain>RowActions.ts`.

### fallow tooling gotchas
- **`fallow-ignore-next-line` must be exactly one physical comment line, directly adjacent to the flagged code.** fallow's suppress-line mechanism only recognizes the marker when the comment containing `fallow-ignore-next-line` is the single line immediately above the flagged line — not the first line of a multi-line/wrapped comment, and not separated from the code by another comment (e.g. an `eslint-disable-next-line` sitting between them). Either shape silently fails to suppress, with no warning from `fallow dupes`/`fallow health` — confirmed 2026-08-29 during a fallow:dupes triage pass, where several markers written across 2+ lines looked correct but were still being flagged. Run `pnpm fallow:dupes:markers` (`scripts/fallow-dupes-markers-check.mjs`) after adding or editing any `fallow-ignore-next-line` marker to catch this before it ships silently broken.
- **`@iconify-json/*` collection packages report as unused dependencies once every icon literal is centralized through `ICONS`** (see "Icons" above) — Nuxt Icon resolves `i-lucide-*`/`i-circle-flags-*`/etc. from those string literals at build time via its own module, not a JS import fallow's dead-dependency check can trace. Add the collection to `.fallowrc.json`'s `ignoreDependencies` (already done for `circle-flags`, `lucide`, `simple-icons`) rather than treating it as real dead code.
- **`fallow health`'s score never moves from `health.maxCyclomatic`/`maxCognitive`/`maxCrap`/`maxUnitSize` or `health.thresholdOverrides`** — those only govern which findings are *reported* (`--complexity`/`--targets`); the score itself uses fixed internal calibration so grades stay comparable across projects. Only `health.ignore` (a blanket file exclude) actually removes a file from the score. Prefer `thresholdOverrides` with a `reason` for findings reviewed and judged legitimate (keeps the file visible with a raised ceiling, documents why) — reach for blanket `ignore` only if you also want the score itself to move.

### Types
Shared domain types (`Associate`, `Tournament`, `Transaction`, status unions, etc.) live in `app/types/index.d.ts`. Add new domain interfaces there rather than colocating them in components.

### Config conventions
- `nuxt.config.ts` pre-bundles `zod` via Vite `optimizeDeps` for faster dev-server startup — keep this if zod imports change.
- ESLint stylistic rules: no dangling commas, 1tbs brace style, max 3 attrs/line (single-line) or 1/line (multi-line) on Vue templates, `vue/no-multiple-template-root` disabled.
- Props: per global convention, use `defineProps<Props>()` with inline destructured defaults, not `withDefaults`.
