<!-- docs/CHANGELOG.md -->
# Changelog

One entry per **notable** commit, newest first, grouped by date. Each entry: the commit subject (gitmoji convention), then what/why bullets. Not every commit gets an entry anymore (see ADR-010 in `PROGRESS.md`) — mechanical ones (`style`, `chore`, trivial `refactor`) are skipped here; the complete raw index (every commit, auto-generated) lives in the root `CHANGELOG.md` via `changelogen`, never edited by hand. This file complements `PROGRESS.md` (curated ADRs and per-area status): the changelog is the annotated commit trail, `PROGRESS.md` is the distilled history — fold important outcomes there, keep the play-by-play here.

## 2026-09-20 — 1v1 Swiss tournaments: results, standings, drops and byes; tournament rules in `/settings`

- 1v1 formats get a real round view (`feat(tournaments): ✨ enter 1v1 results, drops and byes in the Swiss round view`): best-of-3 results entered from cards or a sortable, searchable table (buttons on both players' rows, green for the winner and red for the loser), the same round timer as Commander, live standings beside the tables, and the next round paired from the standings without rematches. Odd player counts can now start a tournament. See ADR-034 and ADR-036 in `PROGRESS.md`.
- Scoring follows the official Magic Tournament Rules (`feat(tournaments): ✨ add the official Swiss scoring and standings-based pairing`, `feat(tournaments): ✨ derive live Swiss standings from results, drops and byes`): 3/1/0 points, OMW%/GW%/OGW% shown as explicit columns with the 0.33 floor, a bye counted as a 2-0 win. The standings are computed from the results, not stored.
- Players can be marked as dropped from any round (round and time recorded, effective from the next round); with an odd count the bye goes to the lowest-ranked player who hasn't had one (`feat(db): 🗃️ add tournament settings, player drops and swiss byes`, three migrations applied to the `app` Supabase project).
- `feat(settings): ✨ make the tournament round rules editable in /settings` — new "Tornei" section before the membership fee: round duration for Commander (75) and 1v1 (50) formats, default round count, rounds per format and the Swiss rounds-by-players table (ADR-035). Swiss scoring is deliberately not a setting.
- Smaller: `refactor(tournaments): ♻️ extract the turn-back/advance buttons shared by the round managers` (both outlined and `md`, turn-back in red), `feat(ui): ✨ highlight the search match in both name and surname of an AssociateTag`, `refactor(prizes): ♻️ let the prizes step take any standing with a label` (the prizes step now also serves the Swiss standings).

## 2026-09-14 – 2026-09-15 — Commander tournament pairing engine ported into `app`

- `app` gains its own live pairing/round-management system for Commander tournaments, ported and adapted from `MagicTheGathering/league` (`feat(tournaments): 🗃️ back round 1 pod creation and avoid-pairs with a real RPC/BFF layer`, `feat(tournaments): ✨ port league's Commander pairing-optimizer/preview UI`, `feat(tournaments): ✨ port league's round-in-progress Commander UI (results, kills, votes, standings, commander select)`) — new schema for the Commander tournament domain (avoid-pairs, round/table uniqueness) and a seeded "Base Commander" ruleset.
- Round 1 pairing/advance/turn-back now also works for 1v1 Swiss formats, not just Commander pods (`feat(tournaments): ✨ round-1 pairing + advance/turn-back for 1v1 Swiss`, with a same-day fix for a Swiss-advance bug and unified turn-back UX).
- Smaller polish same week: a "Reset" button replacing the dedicated pods step, skipping the start-confirm dialog for pod-based formats, and two date-filter fixes (today's own tournament no longer vanishes, lower bound corrected).
- `feat(layout): ✨ show the git commit hash in the version badge` and `feat(layout): ✨ add a password-gated developer view (margins overlay)` — dev-facing additions, unrelated to the pairing work above.

## 2026-09-06 – 2026-09-13 — Telegram bot: rich messages, deep links, `/turni` Mini App, `/risultato`

- The bot's replies were converted wholesale from plain text to grammY "Rich Messages" (blocks, tables, thinking-shimmer drafts) across every command (`/start`, `/help`, `/status`, `/calendario`, `/leghe`, `/iscrizioni`, `/eventi`, `/classifiche`, `/tessera`, `/collegamento`, `/tavolo`, `/supporto`), plus a deep-link manager so `/start <payload>` can jump straight into any command's own flow.
- `/risultato` (post-round result reporting: position + kills) went from a mockup to a full Rich-Message flow with explicit per-step confirmation, pill-button kill/vote pickers, and a per-round score summary table — several follow-up fixes for a stuck position step, duplicated checkmarks, and shape-mismatch crashes.
- New `/turni` Telegram Mini App: a full-screen round timer + Bo3 score tracker with tappable turn-advance quadrants, reworked twice for layout (landscape focus mode, bigger touch targets, split active-turn indicator) after real usage.
- Security hardening found via a same-week code review: rate-limited account-linking attempts to 1/minute (`fix(telegram-bot): 🔒️ stop a member's email link from being silently stolen`), and restricted `/tavolo`'s inline mode to the bot's own chat.
- Misc: `/dado`/`/moneta`/`/tira` dice/coin commands, a `/dioporco` easter egg, commander card art shown in `/tavolo`'s confirmation, and every `timestamptz` display fixed to render in `Europe/Rome` instead of server-local time.

## 2026-09-02 – 2026-09-05 — Telegram bot scaffolded; self-service tournament registration

- `MagicTheGathering/app`'s Telegram bot (grammY) goes from nothing to a working command set in a few days: `/classifiche`, `/tornei` (renamed `/calendario`), `/eventi`, `/leghe`, `/iscrizioni`, `/status`, plus the chat↔associate account-linking flow and admin alert notifications (`notifyTelegramAdmins`/`notifyTelegramSuperAdmins`) — see `docs/architecture/telegram-bot.md`/`telegram-notifications.md`.
- `feat(tournaments): ✨ self-service tournament registration` — players can now register/self-unregister for a tournament directly (web and, same week, via a Telegram button), instead of staff doing it manually.
- `/cartecercate` (wanted-cards) gains pagination and owner-only manage actions in the bot, mirroring the web-side ownership change in ADR-033.

## 2026-08-30 – 2026-09-01

- `feat(ui): ✨ extract YearRangePicker, roll out year filter to 6 pages` and `feat(list-pages): ✨ default DateRangePicker to next-year instead of all-time` (30/08) — consistent date filtering across list pages.
- `feat(tournaments): ✨ default round count by format (Pauper/Premodern/Draft: 4)` and `extend Swiss round-count table past 64 players`.
- `feat(dev): ✨ add dev-only test-login endpoint for browser automation` (2026-09-01) — see `docs/architecture/api.md`'s "Other routes" table; 404s outside dev, lets automated browser testing reach authenticated routes without a real magic-link round trip.

## 2026-08-24 – 2026-08-29 — `/finance` dashboard, trash retention, permissions overhaul

- `feat(finance): ✨ add /finance dashboard` with Contanti/Pos/Paypal breakdowns and a scalable "Riepilogo per categoria" — see ADR-031 in `PROGRESS.md` for why the aggregations are client-side, not Supabase views.
- Trash retention countdown + permanent purge shipped (`feat(trash): ✨ 60-day retention countdown, permanent purge, AssociateTag`) — see ADR-028 for the `pg_cron`/`trash_retention_days` design.
- `admin` promoted to "every power except permanent deletion" and role-assignment locked down (`feat(permissions): ⬆️ admin gains every power except permanent deletion`, `feat(roles): 🔒️ admin can assign roles but never touch super_admin`) — see ADR-029/ADR-030.
- Transactions kept growing: search bar, "Da sistemare" tab flagging real data gaps, "Comped"/"Token Purchase" payment types, bulk payment-type change, calendar-year presets.
- `feat(tournaments): ✨ add useCommanderPods, ported from MagicTheGathering/league` / `add useDraftPods for Draft format pod-size distribution` — the first Commander/Draft pod-formation logic to land in `app`, ahead of the full pairing engine (see 2026-09-14/15 above).

## 2026-08-22 – 2026-08-23 — Events built out end-to-end; soft delete everywhere

- `/events` went from mock data to a full domain in a few days: Google Calendar-style day schedule with click-to-create, edit/bulk-actions, image picker, real detail page with a tournament-activity heatmap.
- Soft delete rolled out to every remaining hard-delete endpoint, plus a cross-domain `/trash` page with admin-only restore — see ADR-017/ADR-025/ADR-026/ADR-027 for the design and its `locations`/`deleted_by` extensions.
- `feat(locations): ✨ add /locations management page` — new CRUD domain.
- Per-card grid loading skeletons rolled out across tournaments/leagues/locations, replacing spinners.

## 2026-08-17 – 2026-08-20 — Role/permission system; leagues & tournaments CRUD; search everywhere

- The full role-based authorization roadmap landed as a numbered series of commits (steps 3–12): `app_role` enum recreated with `super_admin`, `assign_role` RPC, `ROLE_LEVEL`/`PERMISSION_LEVEL`/`can()`, `useUserRole` composable, cache-invalidation plugin, `PageMeta.permission`, auth middleware + `/403` page, and sidebar nav gated by permission — see `docs/architecture/roles.md`/`permissions.md` for the resulting model (this multi-day build predates and underlies ADR-015 onward, no single ADR covers it).
- Leagues gained full CRUD (edit/delete/selection/bulk actions), a cover image that cascades to its tournaments (ADR-018), and dates derived from its own tournaments instead of being editable (ADR-019); `mtg-formats` gained a management modal and DB-backed colors (ADR-016).
- `feat(players): ✨ track login history and add player detail page` — see ADR-022 for the `auth.audit_log_entries` trigger design.
- Search-with-match-highlighting rolled out to associates/players/standings, backed by new shared `HighlightMatch`/`SearchInput` components; new detail pages for leagues/locations/events, each with a tournament-activity heatmap.

## 2026-08-13 – 2026-08-16 — Transactions built end-to-end; public standings/subdomains; guided tours

- `feat(transactions): ✨ build out the transactions feature end-to-end` plus associate edit/renew/bulk-reject workflows and a generalized `ConfirmModal` — the transactions domain's first real version.
- Four rankings (cittadino/commander/premodern/pauper) published on public, unauthenticated subdomains — see ADR-011 in `PROGRESS.md` for the full history of corrections on which routes are actually public vs. behind login, and the eventual cross-domain-redirect fix for an h3/Nitro path-mutation bug.
- `feat(db): 🗃️ schema for events/tournaments/leagues, seed the Hobbit Draft` and `feat(competitions): ✨ migrate events/tournaments/leagues off mock data` — these three domains move onto real Supabase tables.
- `feat(tours): ✨ add guided-tour infrastructure` + tours added to every dashboard page.

## 2026-08-09 – 2026-08-12

- Standings/rankings UI explored as mockups before the real DB migration above: Cittadino ranking + per-format standings, a Commander participation-point rule (see ADR-012 for the tiebreak criterion decided the same window).
- `feat(settings): ✨ replace Notifiche with a live permissions matrix page` and `feat(notifications): ✨ add reusable bell button, redesign the notifications panel` — the bell/slideover UI landed here, still backed by mock data (see ADR-021 in `PROGRESS.md`, proposed later, for why it hasn't moved to real persisted events yet).
- `feat(tesseramento): ✨ public membership application form` and `feat(inputs): ✨ international phone number input` — the public membership-signup flow.
- `feat(shortcuts): ✨ g-x navigation chords, press-g hints, keyboard tour` — see `docs/architecture/shortcuts.md`.

## 2026-08-08

### `refactor(associates): ♻️ extract useCurrentAssociate from the wanted-cards filters`

- The logged-in-user → Associate resolution (by email) was needed by `AddModal.vue` too, to prefill "Giocatore" — not just the "Le mie richieste" filter anymore.

### `feat(wanted-cards): 🗃️ add CardTrader as a second price source`

- Two prices per request instead of one: CardMarket via Scryfall and the CardTrader minimum. Both are snapshots (manual refresh from the context menu, or a weekly job), hence the `*_synced_at` columns.
- CardTrader has no name search, so its blueprint has to be resolved from the set: `scryfall_id`/`set_code` added to requests (backfilled from `scryfall_url` for old rows) plus two cache tables. Two gotchas found along the way: a printing can exist foil-only (Pramikon in C19, Duskmourn's Japanese showcases), so finish has to be derived from the printing, not the requested treatment; and a Scryfall set doesn't map 1:1 to a CardTrader expansion — they split by prefixed code (`dsk`, `cdsk` Collectors, `adsk` Art Series, etc.), so lookup tries the exact code then its siblings.
- Language is filtered on the listings themselves rather than a query param — the hardcoded `language=en` made the two prices incomparable, with gaps up to 4× on Japanese-frame cards.

### `feat(wanted-cards): ✨ show mana cost and card preview while searching`

- Name search moves from `/cards/autocomplete` to `/cards/search` — the former returns bare strings, so mana cost was never in the data. Full card objects let the row render like league's `CommanderSuggestionRow.vue` (mana symbols on a dark chip, hover preview via `MagicCardHoverPreview`).
- The client-side "A-" (Alchemy) prefix filter goes away too — `/cards/search` supports full syntax, so `game:paper` excludes Alchemy cards properly.

### `refactor(components): 🚚 move generic MTG and player components out of wanted-cards`

- `PlayerTag`/`TourGuide` move to root, `ManaCost`/`CardPreview`/`CardPreviewTooltip` to `magic/` (needed by the upcoming Commander area). `Age.vue`/`Prices.vue` lose their `WantedCard` filename prefix — with `pathPrefix: true` Nuxt doesn't dedupe `WantedCardAge` under `wanted-cards/` (the trailing `s` doesn't match), so the auto-imported name became `WantedCardsWantedCardAge` and silently failed to resolve at runtime.
- Extracts `magic/CardHoverPreview.vue`: the cursor-following tooltip was duplicated between `CardPreviewTooltip` and `PrintingRow.vue` (anchor, virtual `:reference`, the three pointer handlers, the same transparent `UTooltip`) and was about to triple with the search row. The two callers shrink from 114/89 lines to 27/40.

### `refactor(validation): 🔥 replace zod with valibot in every form schema`

- Ten schemas converted from `z.*` to `v.pipe()`/`v.object()`; zod drops out of `package.json` and the Vite `optimizeDeps` pre-bundling. valibot requires a message on the base type too, not just the constraint, hence the new `*Required` i18n keys.
- `login.vue` also loses three leftover `console.log`s from the magic-link debugging.

### `feat(i18n): 🌐 add price, search and validation strings, generalize tour keys`

- Tour navigation labels (back/next/finish/stepIndicator) move from `wantedCard.tour` to a top-level `tour` block, so `TourGuide.vue` no longer depends on a domain namespace now that it's generic; `startButton` and `steps` stay under `wantedCard` since they're page content.

### `fix(tooling): 🩹 mark commit-msg hook executable`

- Git only runs a hook if it has the executable bit, and skips it silently otherwise. Unnoticeable on Windows (`core.filemode` is `false`), but the `100644` mode was committed to the index and travels with the repo — on macOS/Linux, commit-message validation would have vanished silently.

### `docs: 📝 log component-folder debt found while reorganizing`

- Three observations from moving generic components out of `wanted-cards`: the `magic/` → `ScryfallPrinting` dependency (accepted knowingly), six components with zero references (including the sole occupant of `rounds/`), and `HomeDateRangePicker` — used by 7 pages despite the name.

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
