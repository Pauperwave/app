<!-- docs/CHANGELOG.md -->
# Changelog

One entry per **notable** commit, newest first, grouped by date. Each entry: the commit subject (gitmoji convention), then what/why bullets. Not every commit gets an entry anymore (see ADR-010 in `PROGRESS.md`) — mechanical ones (`style`, `chore`, trivial `refactor`) are skipped here; the complete raw index (every commit, auto-generated) lives in the root `CHANGELOG.md` via `changelogen`, never edited by hand. This file complements `PROGRESS.md` (curated ADRs and per-area status): the changelog is the annotated commit trail, `PROGRESS.md` is the distilled history — fold important outcomes there, keep the play-by-play here.

## 2026-08-08

### `refactor(wanted-cards): ♻️ unify filters and extract page composables`

- `wanted-cards/index.vue` 805 → 363 lines, split into `useWantedCardsFilters.ts`, `useWantedCardsTableColumns.ts` and `useWantedCardsRowActions.ts`.
- The two divergent filter implementations (TanStack `columnFilters` for the table, hand-written predicates for the grid) collapse into a single `filteredCards` predicate feeding both — they had already drifted apart once on "Trattamento", where the grid's facets came up empty.
- Carries a real bug fix: the table context menu bound `:on-contextmenu` (not a UTable prop) instead of listening for `@contextmenu`, so right-click never populated the clicked row.
- Also adds "Le mie richieste" (resolves the signed-in user to an associate by email), copy-name / Scryfall / CardMarket / CardTrader context-menu entries, and switches to `isPending` so a background refetch after a mutation no longer tears down the table and grid.

### `feat(wanted-cards): ✨ add a reusable tour spotlight and the page's guided tour`

- `useTourSpotlight.ts`/`TourSpotlight.vue` are generic over any Nuxt UI `useTour` instance — they dim the page around the current step's target rect.
- Steps are anchored by css id to real template elements, so components that don't expose a ref (`UFieldGroup`, the button inside `AddModal.vue`) can still be targeted.

### `feat(wanted-cards): ✨ show how long a request has been open`

- Colored age indicator replaces the raw request date in the grid: green under 30 days, amber to 90, red beyond. A bare date never made "this one deserves a follow-up" obvious at a glance.
- The language-flag map, previously duplicated between the page and `GridView.vue`, moves into a shared `WANTED_CARD_LANGUAGE_ICONS` util.

### `perf(wanted-cards): ⚡️ cache Scryfall printings and preload their artwork`

- `useScryfallCardSearch.ts` moves from a bare `$fetch` to a Pinia Colada `useQuery` keyed on card name, so a name looked up before is served from cache (RAM within the session, `localStorage` across sessions via the already-registered persister). See ADR-009.
- Printing images are warmed in the background, so the first hover on a row doesn't start from a cold fetch.

### `feat(wanted-cards): ✨ allow editing the printing of an existing request`

- `EditModal.vue` reuses `AddModal.vue`'s Scryfall printing picker; the card name stays fixed (changing that is still a new request), but the edition isn't.
- Preselecting the saved edition compares `scryfall_uri` without its query string — the API appends tracking params now, while rows migrated from the original mock stored a clean URL, so an exact match never hit.

### `feat(wanted-cards): 🗃️ default requested_at and populate audit columns`

- `requested_at` never had a `default` (inherited from the `found_at` rename), so every request created through `AddModal.vue` landed with `null` — fixed at the DB level plus a backfill of existing rows.
- `created_by`/`updated_by` existed on the table but nothing had ever written them. Now populated from a generic `server/utils/auditColumns.ts` helper, with the FKs retargeted to `pauperwave_associates(uuid)` so the UI can join straight to a display name. A trigger on `auth.uid()` wouldn't work — writes go through the BFF's service-role key, where it's always `null`. See ADR-008.
- Knock-on: with three FKs from this table to `pauperwave_associates`, PostgREST can no longer infer which one an `associate` embed means — the query needs an explicit column hint.

### `feat(layout): ✨ add color-mode switch, version badge and mail feedback links`

- Sidebar theme toggle animated with a View Transitions circular wipe (`useThemeTransition.ts`); `UserMenu.vue`'s appearance submenu now checks `colorMode.preference` rather than the resolved value, and gains an "Automatico" option.
- Feedback/Help open a Gmail compose window instead of a Telegram link — `mailto:` silently no-ops when the OS has no default mail client.

### `test: ✅ configure vitest and Playwright harnesses`

- Mirrors `MagicTheGathering/league`: vitest on happy-dom with an `unplugin-auto-import` mirror of Nuxt's auto-imports, plain `@playwright/test` driving a production build via `webServer`.
- No specs yet, and no Playwright auth-setup project — Supabase magic-link OTP can't be scripted the way league's password auth is. See `docs/architecture/testing.md`.

### `chore(tooling): 🔧 add gitmoji commit-msg hook and changelogen release config`

- `commit-msg` hook copied unmodified from league, enforcing `<type>(<scope>)?!?: <emoji> <description>` against the full 75-gitmoji list; wired up by `postinstall`.
- `changelog.config.ts` drives the auto-generated root `CHANGELOG.md`; this file stays hand-curated (ADR-010).

### `refactor(wanted-cards): 🚚 migrate data layer to Pinia Colada + BFF`

- `wanted-cards` domain migrated to the Pinia Colada + BFF pattern (ADR-007 in `PROGRESS.md`): `useWantedCardsQuery.ts`/`useWantedCardsMutations.ts` replace the old `useAsyncData`-based composable, `server/api/wanted-cards/*.post.ts` + `server/utils/serverAuth.ts` added.
- Fixes the `setStatus` full-page-reload bug for free — Colada distinguishes initial load from background refetch.

### `style: 🎨 add cursor-pointer to all UButton instances`

- Global `app.config.ts` override — Nuxt UI's `<button>` doesn't get `cursor:pointer` by default.

### `feat(wanted-cards): ✨ migrate to real Supabase table, add edit/delete and tri-state status`

- Moves `wanted-cards` off the static in-file mock array onto `pauperwave_wanted_cards`; replaces the `found` boolean with a `status` enum (`searching`/`found`/`abandoned`) plus a trigger-set `found_at`.
- Adds `EditModal.vue` (copies/language/foil/player/notes) and a delete-confirmation modal.

### `feat(wanted-cards): ✨ add live Scryfall search, printing picker and card preview`

- `useScryfallCardSearch.ts` (name autocomplete → printing/edition picker, live API rather than a cached catalog like league's commander search).
- `PrintingRow.vue` (text-based dropdown row with hover preview) and `CardPreview.vue` (color-gradient card preview), both ported from league's commander-search UX.

### `feat(wanted-cards): ✨ add card grid view + shared ViewModeTabs component`

- Extracts the Griglia/Tabella toggle used on `/associates` into a reusable `ViewModeTabs` component, reused for a new card-grid alternative to the `wanted-cards` table.

### `docs: 📝 correct league integration timeline in ADR-003`

- ADR-003 originally described `league` integration as a distant, undated goal with `app`'s DB as the future base for a `league` rebuild — corrected: integration is imminent (deadline 2026-08-30), and `app` absorbs `league`, not the other way around.

## 2026-08-07

### `docs: 📝 log TODOs for associates table styling and contextual row menus`

- Logged observations: unify `/associates` table styling with `/wanted-cards`, simplify its column headers, add a contextual row menu.

### `style(wanted-cards): 🎨 match "Visualizza" button to associates' "Mostra colonne"`

### `style: 🎨 polish scrollbars, dashboard panel spacing and sidebar chrome`

- Includes `scrollbar-gutter: stable` globally on `UTable` (ADR-006 in `PROGRESS.md`).

### `feat(wanted-cards): ✨ add Carte Cercate feature`

- First version of the `/wanted-cards` page: table with card/mana/status columns, add modal wired to Scryfall search, sidebar nav entry. Column order documented as ADR-005.

### `refactor: 🔥 remove redundant "Indietro" button from detail page toolbars`

- Breadcrumbs already provide back-navigation.

### `feat(associates): ✨ add detail page map view, breadcrumbs and residency geocoding`

- New `pauperwave_associate_geocodes` cache table + Nominatim/Photon geocoding scripts, map view on `/associate/[slug]`.

### `chore(deps): ➕ add mana-font, dicebear, @nuxtjs/device dependencies`

## 2026-08-06

### `chore: 📝 add path header comments to all existing source files`

### `refactor: 🚚 move generated database types to shared/utils/types`

### `chore(scripts): ➕ copy check-file-paths.mjs from league, wire up config`

- Path-header checker (`pnpm check:paths`/`check:paths:fix`) copied from `league`, enforces the `// app\path\to\file.ts` header convention.

### `refactor(tournaments): ✨ AcceptancePicker → UListbox transfer list, stepper mockup`

### `refactor(tournaments): 🔥 clear /tournaments mock table, note real one in TODO`

### `feat(nav): ✨ add back/forward navigation on nested tournament pages`

### `fix(inputs): 🩹 fix defineProps() hoisting crash from i18n defaults`

## 2026-08-05

### `docs: 📝 add CLAUDE.md project instructions and initial docs`

- `CLAUDE.md` documents stack, routing, auth flow, and data-fetching conventions for AI agents.
- `docs/PROJECT_ANALYSIS.md` and `docs/BACKLOG.md` capture the initial codebase audit and a ranked backlog.

### `fix(ui): 🩹 fix "Nuova lega" modal title typo, unify click handlers`

- `UModal` title read "Muova lega" instead of "Nuova lega" in the leagues AddModal.
- Open/close toggle click handlers wrapped in an explicit arrow function in both leagues and transactions AddModal, consistent with other AddModal components.

### `fix(auth): 🐛 use session instead of user to avoid getClaims() race`

- `useSupabaseUser()` depends on an async `getClaims()` call with no `.catch()`, which can silently reject and leave the user stuck at `null` even after a successful magic-link login.
- Middleware and callback page switched to `useSupabaseSession()`, which reflects `onAuthStateChange` synchronously.
- Callback page adds a 3s timeout: if no session shows up, shows "link non valido o scaduto" instead of spinning forever.

### `chore: 🔥 remove redundant CODEOWNERS`

- Single-owner repo — `* @emanuelenardi` added no information GitHub doesn't already have from commit history.

### `fix(tournaments): 🐛 correct onSelect handler signature for row click`

- `UTable`'s `@select` emits `(e: Event, row: TableRow<T>)`, but `onSelect` only declared `(row)` — the row argument was silently receiving the `Event` object instead.

### `fix(forms): 🩹 guard null/undefined on optional text inputs`

- `UInput`/`UTextarea` don't accept `null`, but the bound state fields (`mtgo_nickname`/`mtga_nickname`, `companion_code`/`description`) are nullable to match what's sent to Supabase.
- Switched to explicit `:model-value`/`@update:model-value` with a null coalesce.

### `fix(associates): 🐛 correct membership_request_status mismatch, wire real status`

- The "Stato richiesta" column rendered an empty badge for every row: the code read `row.request_status`, but the real DB column had been renamed to `membership_request_status` (values `approved`/`pending`, not `accepted`/`pending`/`rejected`) without the frontend being updated.
- `Associate` now derives from the generated `database.types.ts`.
- Also: virtualize `estimateSize`/`overscan` tuned to the real ~35px row height (was 250px), vertical borders removed, toolbar aligned to baseline, new `membership_status` column and sidebar wiring replacing hardcoded badges, redundant "Stato richiesta" dropdown removed.

### `feat(db): ✨ derive membership status from renewal history, drop dead column`

- `pauperwave_associate_renewals` existed but was never populated; `associate_status` was always `NULL` for all 242 associates.
- Backfills one renewal row per approved associate from `association_date`/`payment_date`, adds view `pauperwave_associates_with_status` computing `membership_status` from the latest renewal year vs. current calendar year.
- Drops the now-redundant `associate_status` column.

### `chore(supabase): ➕ generate DB types and exclude them from lint`

- Adds the `supabase` CLI as a devDependency plus a `supabase:types` script.
- Generated `app/types/database.types.ts` excluded wholesale from ESLint (double-quote style, autogenerated).

### `chore(deps): ⬆️ bump dependencies to latest, pin typescript for peer compatibility`

- `nuxt` 4.4.2→4.5.1, `@nuxt/ui` 4.6.1→4.10.0, plus several majors (`@nuxt/image` 1→2, `@vueuse/nuxt` 13→14, `eslint` 9→10).
- `typescript` pinned to 6.0.3 rather than the newly-released 7.0.2 — `@nuxt/ui` and `@typescript-eslint` don't support it yet.
- `@types/node` added explicitly — stopped arriving transitively after the bump.
