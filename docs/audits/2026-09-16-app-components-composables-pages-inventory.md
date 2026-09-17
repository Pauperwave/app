# Components, Composables & Pages Inventory — `app` (Pauperwave)

Full inventory of `app/components/`, `app/composables/`, and `app/pages/` in the `app` (Pauperwave) project, with a short description of what each file does. Companion to [`2026-09-16-league-components-composables-pages-inventory.md`](2026-09-16-league-components-composables-pages-inventory.md), which documents the sibling (abandoned) `league` project — many files here are direct ports from `league`, noted inline where relevant.

## Pages

### Home / auth / misc

#### `/` — `app/pages/index.vue`
- Role-differentiated dashboard entry point; owns shared chrome (navbar, quick-create menu, notifications bell, guided tour) and delegates content to `HomeStaff` or `HomePlayer`.
- Relies on `useUserRole()` (`isStaff`, `status`) — renders neither dashboard until `status === 'success'` to avoid a flash of the wrong one; `useHomeTour(isStaff)` drives `TourGuide`.
- Default layout, auth-protected via the global middleware.

#### `/login` — `app/pages/login.vue`
- Public login entry, `layout: 'auth'`. Uses `UAuthForm` with a valibot email schema.
- POSTs to `server/api/check-associate.post.ts` to verify the email exists before calling `supabase.auth.signInWithOtp` (`emailRedirectTo=/auth/callback`).
- Handles Supabase's raw rate-limit error message specially (extracts seconds via regex) to keep all toasts i18n'd.

#### `/auth/callback` — `app/pages/auth/callback.vue`
- Completes the Supabase magic-link/OTP session exchange, `layout: 'auth'`.
- Redirects to `route.query.redirect` (defaults `/`) once `useSupabaseSession()` resolves (chosen over `useSupabaseUser()`/`getClaims()`, which can hang unresolved). Shows a 3s-timeout "invalid link" fallback.

#### `/403` — `app/pages/403.vue`
- Static "forbidden" error page, single "back home" button. Default layout.

#### `/calendar` — `app/pages/calendar/index.vue`
- Internal dashboard placeholder route, rendered via `PageInDevelopment` with a tour and a link to the public `/calendario` page; embeds `PublicCalendarPage` in the `#body` slot.
- Relies on `useCalendarPageTour()`, `CopyLinkButton`/`useRequestURL()`.

#### `/finance` — `app/pages/finance/index.vue`
- Finance dashboard: grand-total/fees/net/count/average stat cards, a "by category" table, then Monthly/Type/Format/Tournament/Event overviews (chart+table switches) plus a payment-method cost table, all scoped to a `selectedYear`.
- Gated by `permission: 'view-finance'`; relies on `useTransactionsQuery()`, `useFinanceSummary()`, `useFinanceTour()`.

#### `/telegram/turni` — `app/pages/telegram/turni.vue`
- Single-screen table-side helper for a Pauper/Premodern Bo3 round: 50-min round timer, match game score, extra-turns counter. No backend/persistence, `layout: 'telegram'`, integrates the Telegram WebApp script.
- Composes `useRoundTimer`, `useExtraTurns`, `useMatchScore` and renders `TelegramMatchScoreSection`, `TelegramRoundTimerSection`/`TelegramExtraTurnsSection`.

#### `/tesseramento` — `app/pages/(public)/tesseramento/index.vue`
- Public 9-step wizard for new-member registration/renewal, `layout: 'public'`, noindex.
- Step 1 sends a Supabase magic-link OTP; after redirect, branches into `new` (full form), `renewal` (one-click confirm), or `blocked` based on `/api/associates/tesseramento-status`.
- Shares `associateFormObjectSchema`/`createAssociateFormState` with `associates/list/AddModal.vue`; final submit posts to `/api/associates/apply`.

#### `/tesseramento/informativa-dati`, `/tesseramento/informativa-privacy` — `app/pages/(public)/tesseramento/informativa-{dati,privacy}.vue`
- Public static privacy/data-processing notice pages, rendering a self-authored markdown file via `markdown-it` + `v-html`. `layout: 'public'`, noindex.

### associates

#### `/associate/[slug]` — `app/pages/(community)/associate/[slug].vue`
- Read-only associate detail page: resolves the `Associate` by slugified full name, shows avatar/badges, four `DetailCard`s, membership event timeline, per-associate transactions table, and a link to the linked `Player` profile.
- Key composables: `useAssociatesQuery`, `usePlayersQuery`, `useAssociateMembershipEventsQuery`, `useTransactionsQuery`, `useAssociateTransactionsTableColumns`.

#### `/associates` — `app/pages/(community)/associates/index.vue`
- The roster: approved associates only. Gated by `permission: 'view-associates'`.
- `UTable` (with map view alternative), status tabs, year-range renewal filter, bulk actions (renew, approve-renewal), row context menu, guided tour.
- Notable: replaces `columnFilters.value` wholesale to avoid a `v-model:column-filters` race (see project CLAUDE.md gotcha).

#### `/associates/requests` — `app/pages/(community)/associates/requests.vue`
- The triage queue: every associate not yet approved. Same permission gate.
- Sorted oldest-request-first, status tabs (all/pending/rejected), bulk approve (`ApproveModal`)/reject (`ConfirmModal` + undo)/restore, row context menu, links to public `/tesseramento`.

### players

#### `/players/[slug]` — `app/pages/(community)/players/[slug]/index.vue`
- Player detail page (slug-based, not uuid) — header card + `DetailCard` grid; gated by `permission: 'view-players'`.
- Renders login history, Commander match history, and Commander decks as three self-contained cards; no edit UI (players derive from their associate record).

#### `/players` — `app/pages/(community)/players/index.vue`
- List page for all players; gated by `permission: 'view-players'`.
- `UTable` with active/inactive tabs, global search, column-visibility menu, row context menu (promote to role, copy email, delete), guided tour.

### transactions / wanted-cards

#### `/transactions` — `app/pages/(community)/transactions/index.vue`
- Payments list: table view only, gated by `permission: 'view-finance'`, grouped-by-payer optional, filtered by year range and type tab (payment type / errors / comped).
- `?action=create` auto-opens the Add modal on mount.

#### `/wanted-cards` — `app/pages/(community)/wanted-cards/index.vue`
- Card-request board with three view modes (table/grid/dense, default dense), filterable by status/color identity/"only mine", groupable by player.
- Supports dragging a Scryfall card image onto the page to prefill the Add modal.

### events

#### `/events` — `app/pages/(competitions)/events/index.vue`
- List page for events; grid (default) or table view. Toolbar: search, status tabs, `YearRangePicker`, `AddModal` (also via `?modal=`).
- Row context menu (copy link/id, edit, "Copia evento", delete); bulk status-change/delete with undo toast.

#### `/events/[eventId]` — `app/pages/(competitions)/events/[eventId]/index.vue`
- Event detail page, uuid-keyed. Info card (name/status/organizer/location/date range/tournament count), `DaySchedule` (hour-grid, click-to-create a tournament), and a grid of the event's tournaments.

#### `/events/[eventId]/EventParticipants`, `/events/[eventId]/EventResults` — placeholder-only routes, each rendering a single translated placeholder string, no logic.

### leagues / rulesets / formats

#### `/leagues/[leagueId]` — `app/pages/(competitions)/leagues/[leagueId]/index.vue`
- League detail page: presentation card, status-colored tournament heatmap, mock leaderboard card, grid of the league's tournaments.
- Toolbar: "Add existing tournaments" (`AddTournamentsModal`), "Nuovo torneo" (pre-linked).

#### `/leagues` — `app/pages/(competitions)/leagues/index.vue`
- List page for leagues with grid/table toggle, status filter tabs, name search, selection + bulk actions, context menu, guided tour, add/edit/copy modals.

#### `/rulesets` — `app/pages/(competitions)/rulesets/index.vue`
- Gated by `permission: 'manage-rulesets'`. Publishes scoring regulation per format via tabs (Cittadino/Commander/Premodern/Pauper/Draft/Sealed).
- Cittadino's point rows computed straight from `CITTADINO_POINTS_BY_RANK`/`CITTADINO_MIN_POINTS` constants — static/derived content, no data query.

### locations

#### `/locations` — `app/pages/(competitions)/locations/index.vue`
- List page for venues; gated by `permission: 'manage-locations'`. Grid/table toggle, `AddModal`, context menu; create+edit only (no delete/bulk actions).

#### `/locations/[slug]` — `app/pages/(competitions)/locations/[slug]/index.vue`
- Location detail page, slug-based. `PresentationCard` header, a status-colored `CalendarHeatmap` of tournament activity, and a grid of tournaments hosted at this location (date-range filtered).

### standings / classifiche (public)

#### `/standings/cittadino` — `app/pages/(competitions)/standings/cittadino/index.vue`
- Internal/authenticated Cittadino standings page; delegates data/columns/filters to `useCittadinoStandingsPage(search)`. Edition tabs, format filter, search, legend, copy/open public-link pair, matrix table.

#### `/standings/commander`, `/standings/pauper`, `/standings/premodern` — one-line wrappers rendering `<StandingsFormatPage format="..." />`, sharing `FormatPage.vue`.

#### `/classifiche` — `app/pages/(public)/classifiche/index.vue`
- Public landing page linking to the four per-format public pages; exists so a generic "classifiche" link resolves instead of 404ing. `layout: 'public-wide'`.

#### `/classifiche/cittadino` — public counterpart of `/standings/cittadino`, backs `cittadino.pauperwave.org`, renders `PublicCittadinoPage`.

#### `/classifiche/commander`, `/classifiche/pauper`, `/classifiche/premodern` — public counterparts of the respective internal pages, render `PublicFormatPage format="<format>"`.

#### `/calendario` — `app/pages/(public)/calendario/index.vue`
- Public, unauthenticated route backing `calendario.pauperwave.org`, `layout: 'public-wide'`. Renders `PublicCalendarPage` only.

### tournaments

#### `/tournaments` — `app/pages/(competitions)/tournaments/index.vue`
- List page for all tournaments: search, grid/table toggle, year range, group-by, status/format filters (swap for bulk-actions bar on selection).
- Shares `TournamentsListAddModal`/`EditModal`, context menus, bulk actions; also owns `MtgFormatsManageModal`.

#### `/tournaments/[tournamentId]` — `app/pages/(competitions)/tournaments/[tournamentId]/index.vue`
- Main tournament management page: a `UStepper` with dynamic slots — `acceptance`, one `round-N` per computed round count, `awards`, `leaderboard`.
- Composes `AcceptancePicker`, `CommanderRoundManager`/`SwissRoundManager`/`RoundManager` (per-format), `Awards`, `Leaderboard` (stub), `PodsManager` (Draft), plus `pairing/TablePreviewModal`/`SwissTablePreviewModal` for table formation.
- Step restoration is one-shot, deferred to `onMounted` (client-only) to avoid an SSR/client hydration mismatch.

### statistics

#### `/statistics` — `app/pages/(analytics)/statistics/index.vue`
- Main statistics dashboard: year selector driving point-in-time cards/charts. Composes `AssociatesStatsCards`, `AssociatesGrowthChart`, and a 2-col grid of `AgeDistributionChart`/`RenewalTimingChart`/`TournamentsPerYearChart`/`WantedCardsStatusChart`.

#### `/statistics/commanders` — `app/pages/(analytics)/statistics/commanders/index.vue`
- Commander catalog browse/table page (ported from league). One row per commander name with player/match/win/kill counts and average score; sortable table.

#### `/statistics/commanders/[commanderSlug]` — `app/pages/(analytics)/statistics/commanders/[commanderSlug].vue`
- Commander detail page (ported from league). Hero art, mana cost, stat cards, win-rate donut chart, list of decks featuring the commander.

#### `/statistics/decks` — `app/pages/(analytics)/statistics/decks.vue`
- Stub page: title only, no body content yet.

### settings / trash

#### `/settings` (layout) — `app/pages/(settings)/settings.vue`
- Shell for all `/settings/*` subpages: a second nav-tabs bar (General/Profile/Members/Permissions/Domains), only rendered for `can('access-settings')`.

#### `/settings` (index) — `app/pages/(settings)/settings/index.vue`
- Membership fee form (gated `manage-membership-fees`) and trash retention days form (gated `purge-trash`).

#### `/settings/domains` — static reference table of the pauperwave.org subdomain map, hand-maintained.

#### `/settings/members` — lists all members/roles with inline role reassignment plus "Assign role" button.

#### `/settings/notifications` — notification preference toggles; local state only, not persisted (mock UI).

#### `/settings/permissions` — full role/permission access matrix (feature × Public/Player/Organizer/Admin/SuperAdmin), hand-maintained.

#### `/settings/profile` — profile edit form scaffold, not wired to real auth/user data.

#### `/trash` — `app/pages/(settings)/trash.vue`
- Soft-deleted-items table (7 entity types) with per-row restore (immediate) and purge (confirm modal, gated `purge-trash`).

## Components

### associates/

#### `AssociatesTableToolbarActions` — `app/components/associates/AssociatesTableToolbarActions.vue`
- Thin wrapper rendering `ColumnVisibilityMenu`; shared "show columns" dropdown for both associate list pages.

#### `SubNav` — `app/components/associates/SubNav.vue`
- Roster/Requests switcher (`UNavigationMenu`), shown on both associate list pages. Props: `pendingCount`, `associatesCount`.

### associates/fields/

#### `BirthInfoFields` — `app/components/associates/fields/BirthInfoFields.vue`
- Shared birth-info fields (location, date, state, province), used by Add/EditModal and `/tesseramento`. Province required only for an Italian birth state.

#### `ConsentsFields` — `app/components/associates/fields/ConsentsFields.vue`
- Statute-read + data-consent checkboxes, embeds `ConsentSocialField`. Prop `disabled?` (EditModal locks once declared).

#### `ConsentSocialField` — `app/components/associates/fields/ConsentSocialField.vue`
- Single social-consent checkbox linking to `/tesseramento/informativa-privacy`.

#### `PersonalInfoFields` — `app/components/associates/fields/PersonalInfoFields.vue`
- First/last name + phone fields (email excluded). Phone optional when the associate is a minor.

#### `ResidencyFields` — `app/components/associates/fields/ResidencyFields.vue`
- Residency address/house-number/city/province/CAP fields.

#### `TaxCodeField` — `app/components/associates/fields/TaxCodeField.vue`
- Single required tax-code input.

### associates/list/

#### `AddModal` — `app/components/associates/list/AddModal.vue`
- Modal wrapping `FormFields` inside a `UForm`; creates a new associate. Resets on submit/explicit cancel, not on outside-click.

#### `ApproveModal` — `app/components/associates/list/ApproveModal.vue`
- Confirms bulk-approving a set of request ids.

#### `BulkActionsBar` — `app/components/associates/list/BulkActionsBar.vue`
- Shared bulk action bar for both list pages. Props: `count`, `side`, `showApprove/showReject/showRestore/showRenew/showApproveRenewal`.

#### `EditModal` — `app/components/associates/list/EditModal.vue`
- Modal editing an existing associate; refills form state on open; locks consent checkboxes.

#### `FiltersBar` — `app/components/associates/list/FiltersBar.vue`
- Search input + `StatusFilterGroup`, shared by both list pages.

#### `FormFields` — `app/components/associates/list/FormFields.vue`
- Two-column layout composing all `fields/` sub-components into sections.

#### `FormSection` — `app/components/associates/list/FormSection.vue`
- Generic `<h3 title>` + spaced slot content shell.

#### `MapView` — `app/components/associates/list/MapView.vue`
- Leaflet map plotting associates with known geocodes over Italy; "missing coordinates" alert for the rest.

#### `NumberModal` — `app/components/associates/list/NumberModal.vue`
- Modal for editing `pauperwave_associate_number`, with live duplicate-check.

### associates/single/

#### `MembershipTimeline` — `app/components/associates/single/MembershipTimeline.vue`
- Renders `AssociateMembershipEvent[]` as a `UTimeline` (newest first).

### badges/

#### `FormatBadge` — `app/components/badges/FormatBadge.vue`
- Renders a Magic format as a `UBadge`, colored by overriding `--ui-primary` locally via `useFormatColor()`.

#### `LeagueBadge` — `app/components/badges/LeagueBadge.vue`
- Clickable neutral badge linking to a league's detail page.

#### `LocationBadge` — `app/components/badges/LocationBadge.vue`
- Clickable neutral badge linking out to Google Maps; displays short venue name.

### calendar/button/

#### `AddToCalendarButton` — `app/components/calendar/button/AddToCalendarButton.vue`
- Device-aware "add to calendar" action: iOS downloads an `.ics`, other platforms open a Google Calendar link.

#### `ContactButton` — `app/components/calendar/button/ContactButton.vue`
- Static `tel:` link showing a hardcoded phone number.

#### `RegisterButton` — `app/components/calendar/button/RegisterButton.vue`
- "Iscriviti"/"Disiscriviti" toggle shared between `/calendario` and `/calendar`. Without a tournament shows a placeholder toast.

#### `ShareButton` — `app/components/calendar/button/ShareButton.vue`
- Shares the current page URL via Web Share API, falling back to clipboard copy.

#### `TaxCodeButton` — `app/components/calendar/button/TaxCodeButton.vue`
- Copies a hardcoded codice fiscale to clipboard for 5x1000 tax designation.

### calendar/card/

#### `Base` — `app/components/calendar/card/Base.vue`
- Shared shell for the mixed Event/Tournament timeline on `/calendario`: image, title, share, date, meta/body/footer slots, add-to-calendar/register footer.

#### `Event` — `app/components/calendar/card/Event.vue`
- Event variant of `Base`; renders a nested list of the event's tournaments in the footer.

#### `Tournament` — `app/components/calendar/card/Tournament.vue`
- Standalone-tournament variant of `Base`; renders format badge + time range.

### calendar/ (root)

#### `DetailSlideover` — `app/components/calendar/DetailSlideover.vue`
- Right-side slideover for `/calendario`, driven by `useCalendarDetail()`. Handles mobile back-gesture via `history` state.

#### `EventDetailContent` / `EventDetailHero` — body/hero content for the event branch of `DetailSlideover`.

#### `Footer` — `app/components/calendar/Footer.vue`
- Static footer: sponsor logo, `TaxCodeButton`/`ContactButton`.

#### `PartnerDiscounts` — `app/components/calendar/PartnerDiscounts.vue`
- List of partner discount codes with copy-to-clipboard buttons.

#### `TournamentDetailContent` / `TournamentDetailHero` — body/hero content for the tournament branch of `DetailSlideover`, hero includes an explicit close button.

### cittadino/

#### `FiltersDropdown` — `app/components/cittadino/FiltersDropdown.vue`
- Shared format-filter dropdown + summary text, deduped out of `PublicCittadinoPage.vue` and `standings/cittadino/index.vue`.

#### `StandingsBody` — `app/components/cittadino/StandingsBody.vue`
- Shared mock-data-notice + error/loading/table body, deduped out of the same two pages.

### events/fields/

#### `SchedulingFields` — `app/components/events/fields/SchedulingFields.vue`
- Date + start-time + end-time (no round-count field, unlike tournaments).

### events/list/

#### `AddModal` — `app/components/events/list/AddModal.vue`
- Modal + trigger to create an event. Prop `sourceEvent?` drives "Copia evento".

#### `BulkActionsBar` — `app/components/events/list/BulkActionsBar.vue`
- Status dropdown + delete button when events are selected.

#### `Card` / `Cover` — grid-view event card and its cover/image area (status badge, checkbox, quick "set image").

#### `EditModal` — modal to edit an existing event.

#### `GridView` — responsive grid of event cards.

### events/single/

#### `DaySchedule` — `app/components/events/single/DaySchedule.vue`
- 08:00–24:00 hourly grid for one event day; click empty slot to seed a tournament, click a block to edit.

### events/ (root)

#### `StatusBadge` — `app/components/events/StatusBadge.vue`
- Thin wrapper around `ui/StatusChangeBadge.vue` for the Event domain.

### finance/

#### `CategorySummaryTable`, `EventSummaryTable`, `FormatSummaryTable`, `MethodCostTable`, `MonthSummaryTable`, `TournamentSummaryTable`, `TypeSummaryTable` — sortable summary tables (by category/event/format/method/month/tournament/type) feeding `/finance`.

#### `FormatChart.client`, `MonthlyTrendChart.client`, `TournamentChart.client`, `TypeChart.client` — client-only unovis charts (ranking bars, stacked area, combined line+scatter) for the same breakdowns.

#### `FormatOverview`, `MonthlyOverview`, `TournamentOverview`, `TypeOverview` — chart/table view-mode switch wrappers pairing each chart with its table.

#### `SummaryCard` — shared `UCard` + `ListSkeleton`-while-pending wrapper extracted from duplication across all `*SummaryTable.vue`.

### home/ (root)

#### `Player` — `app/components/home/Player.vue`
- Home dashboard body for the `player` role: membership status card, recent payments, upcoming tournaments, rankings placeholder.

#### `QuickCreateMenu` — `app/components/home/QuickCreateMenu.vue`
- "+ new..." dropdown built from `useQuickCreateItems()`, split into Community/Competitions groups.

#### `Staff` — `app/components/home/Staff.vue`
- Home dashboard body for organizer/admin/super_admin: stat cards, "Upcoming" and "Recent activity" sections, delegating to `home/staff/*` subcomponents.

### home/staff/

#### `ActiveLeaguesCard`, `NextLocationCard`, `PendingActionsCard`, `RecentAssociatesCard`, `RecentTransactionsCard`, `UpcomingTournamentsCard` — small list cards for the staff home dashboard, each taking pre-fetched data as props.

### inputs/

#### `UClearButton` — ghost icon button that clears a value.

#### `UDateTimeInput` — thin wrapper around Nuxt UI's `UInputDate` (24-hour default).

#### `UPhoneInput` — country-select + national-number combo using `libphonenumber-js` for live formatting/validation.

#### `UStatusSelect` — `UFormField` + `USelect` for choosing a status with icon/color per option.

### layout/

#### `ColorModeSwitch` — icon-only light/dark toggle using `useThemeTransition()`.

#### `DeveloperViewToggle` — popover-gated toggle for the developer-view margin overlay, ported from `league`.

#### `TeamsMenu` — team-switching dropdown, currently a single hardcoded "Pauperwave" team.

#### `UserMenu` — main user dropdown: profile/settings, "view as" role preview, theme pickers, GitHub link, logout.

#### `VersionBadge` — shows `v<version> • <sha> • <env>` with copy-to-clipboard.

### leagues/fields/

#### `LeagueDataFields` — image picker, status+ruleset select, name input. No start-date field (derived from tournaments).

### leagues/ (root)

#### `LeagueTournamentsProgress` — shared "completed/total tournaments" label + progress bar.

#### `RulesetBadge` — league's ruleset name with an inline quick-change dropdown.

#### `StatusBadge` — thin wrapper around `ui/StatusChangeBadge.vue` for the League domain.

### leagues/list/

#### `AddModal`, `BulkActionsBar`, `Card`, `Cover`, `EditModal`, `GridView` — same shapes as the events/tournaments list components, for leagues.

### leagues/single/

#### `AddTournamentsModal` — pick existing tournaments to link to a league.

#### `Leaderboard` — **preview-only, mock data** (40 fake rows), flagged for deletion once real standings exist.

#### `PresentationCard` — league detail page header card.

### locations/fields/

#### `ContactFields`, `GeneralInfoFields`, `OpeningHoursFields`, `PositionFields`, `SocialFields` — form field groups for a location, all mutating a shared `state` prop directly.

### locations/list/

#### `AddModal`, `Card`, `EditModal`, `FormFields`, `FormSection`, `GridView` — standard list CRUD components for locations.

#### `LocationStatus` — "temporarily closed" badge.

#### `MapPreview` — Leaflet live preview driven by `useAddressGeocode`.

#### `OpeningHoursEditor` — per-day checkbox + two independent time pickers.

#### `SocialLinks` — row of icon links filtered to the ones set on a location.

### locations/single/

#### `PresentationCard` — location detail page header card.

### locations/ (root)

#### `TypeBadge` — "Negozio" (shop) badge.

### magic/

#### `CardArtPicker` — cover-image picker sourcing Scryfall art crops for banners/covers.

#### `CardArtPickerRow` — printing row renderer with hover preview.

#### `CardHoverPreview` — generic hover-follows-pointer card image preview.

#### `CardPreview` — always-mounted large preview of a selected Scryfall printing.

#### `CardPreviewTooltip` — thin specialization of `CardHoverPreview` for a card-name link.

#### `ManaCost` — renders mana symbols via the `mana-font` icon font, scoped CSS to avoid Tailwind class collision.

#### `SetImageModal` — shared "Imposta immagine" modal wrapping `CardArtPicker`, used by tournaments'/events' bulk actions.

### mtgFormats/

#### `ManageModal` — `app/components/mtgFormats/ManageModal.vue`
- Lightweight CRUD for `mtg_formats`: inline-editable name, color picker, delete (blocked when a format is in use, undoable).

### notifications/

#### `BellButton` — bell icon with unread chip, opens the notifications slideover.

#### `Slideover` — notifications list grouped Today/This Week/Earlier; mark-as-read/dismiss are placeholder actions.

### players/single/

#### `BracketPickerModal` — modal for choosing a Commander deck's power-level bracket (1–5), ported from `league`.

#### `CommanderDecksCard` — card listing a player's Commander decks with bracket picker.

#### `CommanderMatchHistoryCard` — card listing a player's Commander match history.

#### `LoginHistoryCard` — card rendering a player's login-history heatmap.

### public/

#### `MatrixTable` — generic standings-matrix wrapper around `UTable`, pins position/name/total columns and paints a hover crosshair.

#### `PublicCalendarPage` — the actual implementation behind both `/calendario` and embedded `/calendar`; merged timeline of Event+Tournament cards, month picker, city filter.

#### `PublicCittadinoPage` — public (no-auth) counterpart of the internal Cittadino standings page.

#### `PublicFormatPage` — public (no-auth) counterpart of `FormatPage.vue` for commander/premodern/pauper.

### query/

#### `DataFreshnessIndicator` — "updated X ago" relative-time label with a live dot, self-ticks every 30s.

#### `RefreshControl` — manual refresh button + `DataFreshnessIndicator`, wired to `useQueryFreshness`.

### rulesets/

#### `FormatRulesCard` — `app/components/rulesets/FormatRulesCard.vue`
- Presentational card documenting a format's league-scoring regulation; data hardcoded, mirrors mock leagues in the standings API.

### rounds/single/

#### `ResultAddModal` — `app/components/rounds/single/ResultAddModal.vue`
- Placeholder stub: renders a single translated placeholder string, no logic.

### settings/

#### `AssignRoleModal` — modal to search an account-linked associate and assign them a role.

#### `MembersList` — list of members with inline role-reassignment select.

### standings/

#### `FormatBody` — shared mock-data-notice + loading/table body for `FormatPage.vue`/`PublicFormatPage.vue`.

#### `FormatPage` — internal/authenticated per-format standings page body; league tabs, copy/open public-link pair, search, legend.

### statistics/

#### `AgeDistributionChart.client` — bar chart of member ages + Gaussian-KDE density curve overlay.

#### `AssociatesGrowthChart.client` — stacked bar chart of Nuovi/Rinnovati/Non rinnovati.

#### `AssociatesStatsCards` — 5-column stat-card grid (total/new/not-renewed/median age/tournaments).

#### `CommanderWinRateChart.client` — donut chart of win rate for one commander.

#### `RenewalTimingChart.client` — bar chart of renewal counts bucketed by month.

#### `StatChartCard` — shared shell (header + value + caption + legend) for every `/statistics`/`/finance` chart.

#### `StatChartCardSkeleton` — static skeleton matching `StatChartCard`'s shape, used as a `ClientOnly` fallback.

#### `TournamentsPerYearChart.client` — stacked bar chart of tournaments hosted per year, split by format.

#### `WantedCardsStatusChart.client` — stacked bar chart of wanted-card status over time.

### telegram/

#### `MatchScoreSection` — presentational match-score display + win/reset buttons.

#### `ExtraTurnsSection` — presentational extra-turns picker/counter.

#### `RoundTimerSection` — presentational timer label + toggle/reset/adjust buttons.

### tesseramento/

#### `ConsentsStep` — thin wrapper rendering `AssociatesFieldsConsentsFields` for the wizard.

#### `EmailStep` — email input step, "send OTP" button.

#### `RenewalStep` — one-click "conferma rinnovo" screen for already-approved associates.

#### `VerifyStep` — "check your email" waiting screen with resend/back actions.

### tour/

#### `Guide` — renders spotlight + step popover UI driven by a `UseTourReturn` instance; registers `h`/arrow-key shortcuts.

#### `Spotlight` — teleports a dimming overlay to `<body>`, highlighting the current tour target.

### tournaments/fields/

#### `OrganizerDataFields` — organizer/location/league/event selects.

#### `SchedulingFields` — start date/time, end time, round count, round duration.

#### `TournamentDataFields` — image picker, format/status, name/companionCode, entryFee/prizes, description.

### tournaments/list/

#### `AddModal` — create tournament, supports calendar-slot pre-seeding and "Copia torneo".

#### `BulkActionsBar` — mark-status, set-image, set-entry-fee, set-league (creatable), delete.

#### `Card` / `Cover` — grid-view tournament card and its image/date-chip/status-badge block.

#### `EditModal` — edit an existing tournament.

#### `FiltersBar` — status filter, format select, show/hide-external toggle, "manage formats".

#### `GridView` — responsive grid of tournament cards.

#### `LeagueLink` — small text-link under a card's title to its league.

### tournaments/single/

#### `AcceptancePicker` — the acceptance step's core UI: two tables (pre-registered / accepted-paid) with transfer, search, payment-method buttons.

#### `AcceptancePickerToolbarRow` / `AcceptanceSearchAddRow` — shared toolbar/search-add row used by both of `AcceptancePicker`'s tables.

#### `Awards` — grid of `TournamentAwardCard`s for end-of-tournament highlights.

#### `CommanderRoundManager` — full Commander "round in progress" view: pairings grid, status sidebar, winner checklist, standings, advance/turn-back flow.

#### `Leaderboard`, `Participants`, `RoundResults`, `RoundManager` — unimplemented stubs/placeholders.

#### `PlayersCountBadge` — "N giocatori · table breakdown" badge.

#### `PodsManager` — Draft-only pod-formation modal (drag-and-drop, preview-only).

#### `SwissRoundManager` — 1v1 Swiss round view, Phase 1 (pairings + advance/turn-back only).

#### `TournamentAwardCard` — single award card (victim/killer/brewer/player).

### tournaments/single/pairing/

#### `CommanderArt`, `CommanderCardPreview`, `CommanderModal`, `CommanderSearch`, `CommanderSuggestionRow`, `CommanderVoteCard` — commander-selection UI, ported bit-by-bit from `league`.

#### `CurrentTime` — live clock for `RoundTimer`'s fullscreen mode.

#### `DeckPlayVotesModal`, `VoteGrid` — brew/play vote modal and its per-category grid.

#### `ForbiddenPairsSection`, `PairingPresetButtons`, `PairingSettingsModal`, `PairingWeightsSection` — pairing-optimizer settings UI.

#### `KillFlowCanvas`, `KillPlayerNode`, `KillTrackerModal` — Vue Flow-based kill tracker (no self-kill, unlike league).

#### `RoundPairingCard`, `RoundStatusCard`, `RoundStatusRow`, `RoundStatusSection` — round-in-progress pod cards and the "Stato inserimento" sidebar.

#### `RoundTimer`, `TimerControlButton` — full 3-phase round countdown, ported 1:1 from league.

#### `StandingsSidebar` — live-standings sidebar for a Commander round in progress.

#### `SwissTablePreviewModal`, `TablePreviewModal`, `TablePreviewGrid`, `TablePreviewToolbar`, `TableCard`, `TableSeatItem` — table-formation preview/editing UI (Commander optimizer-backed, Swiss free-drag).

#### `TablePlayerReceiptCard`, `TableReceiptSummary`, `TableScoreBreakdownModal` — pairing-score breakdown display.

#### `TableScoreGridModal` — drag-and-drop dense-rank placement UI for a pod's final standings.

#### `TableScoresModal` — read-only per-player score-breakdown table for a pairing.

#### `TableStateBadge` — small complete/pending badge.

#### `TablesFullscreenView` — big-display non-interactive readout of the round's tables.

#### `TournamentCommanderModal`, `TournamentVotesModal` — modal wrappers around `CommanderModal`/`DeckPlayVotesModal`.

#### `WinnerChecklistCard` — "Vincitori tavoli" prize hand-out checklist.

### tournaments/ (root)

#### `StageLabel` — "Nª tappa" superscript suffix next to a tournament name.

#### `StatusBadge` — thin wrapper around `ui/StatusChangeBadge.vue` for the Tournament domain.

### transactions/fields/

#### `PayerFields` — `app/components/transactions/fields/PayerFields.vue`
- Shared payer picker (preset-associate / associate-search / external-payer tabs) for Add/EditModal.

### transactions/list/

#### `AddModal` — creates a transaction; `presetAssociate`/`hideTrigger` support the "Rinnova" flow.

#### `BulkActionsBar` — count+clear / change-type+delete bar.

#### `EditModal` — edits an existing transaction, shows createdBy/updatedBy traceability.

#### `PaymentInfoFields` — shared "Dati pagamento" field grid, `defineModel`-based.

### ui/

#### `AddButton` — the "Nuovo X" trigger button, no size/color/variant props by design.

#### `AssociateNumberBadge` — `PW-XXXX` membership number badge.

#### `AssociateTag` — person name + avatar, optional hover popover with membership status.

#### `AssociateTypeBadge` — associate type badge via `ASSOCIATE_TYPE_BADGE_CONFIG`.

#### `CalendarDayChip` — shared `#day` slot content for calendar pickers.

#### `CalendarHeatmap` — GitHub-style contribution heatmap, hand-built with Tailwind (not ECharts).

#### `ChordHint` — muted keyboard-shortcut chip(s).

#### `ColumnVisibilityMenu` — shared "Mostra colonne" dropdown trigger.

#### `ConfirmModal` — generic destructive-confirmation modal, ported/simplified from league.

#### `ConsentBadge` — Sì/No badge for a boolean consent value.

#### `CopyLinkButton` / `CopyOpenLinkPair` — copy-link icon button, and a copy+open pair.

#### `DateRangePicker` — calendar-based range picker with a preset sidebar.

#### `DateWithRelativeTooltip` — absolute date with relative-time tooltip.

#### `DetailCard` — generic card shell: header title + icon-labeled field list.

#### `EditIconButton` — icon-only edit button with tooltip.

#### `EmptyState` — centered muted "nothing to show" placeholder.

#### `GroupByToggleButton` — icon-only "group by X" toggle.

#### `HighlightMatch` — wraps the first substring match of a query in `<mark>`.

#### `ImageOffPlaceholder` / `ImageWithFallback` — "no cover image" fallback, and a three-state image (real/spinner/fallback).

#### `ListPageNavbar` — shared list-page navbar skeleton (collapse, search+refresh, tour button).

#### `ListSkeleton` — table-only loading placeholder.

#### `MembershipRequestStatusBadge` / `MembershipStatusBadge` — request-status and membership-status badges.

#### `PageInDevelopment` — shared placeholder shell for not-yet-built routes.

#### `PaymentMethodBadge` / `PaymentTypeBadge` / `RenewalKindBadge` — payment-domain badges.

#### `RoleBadge` — member role badge.

#### `RolePreviewBanner` — banner shown while a super-admin is previewing another role.

#### `RowActionsMenu` — visible per-row actions ellipsis menu.

#### `SearchInput` — `UInput` with search icon and conditional clear button.

#### `StandingsLegend` — "counted/dropped/absent" legend row.

#### `StartDatePickerField` — start-date `UPopover`/`UCalendar` field.

#### `StatCard` — icon+title+value page card.

#### `StatusChangeBadge` — generic permission-gated quick-change status badge (backs the domain `StatusBadge` wrappers).

#### `StatusFilterGroup` — row of toggle buttons for status filtering.

#### `TableSelectionFooter` — sticky "N of M selected" row.

#### `TourStartButton` — "Tour guidato" navbar button.

#### `ViewModeTabs` — grid/table view-mode toggle.

#### `YearRangePicker` — year quick-jump select paired with an icon-only `DateRangePicker`.

### wanted-cards/ (root)

#### `Age` — colored dot + label for a wanted card's age.

#### `FormFields` — shared printing/copies/language/foil/player/notes fields for Add/EditModal.

#### `MetaBadges` — copies/language/treatment badges.

#### `Prices` — Cardmarket/CardTrader price pair, highlighting the cheaper one.

### wanted-cards/list/

#### `AddModal` — creates a wanted card via live Scryfall name search; supports drag-and-drop prefill.

#### `BulkActionsBar` — mark-status, copy names, refresh prices, delete.

#### `ConfirmModals` — single-card delete and generalized bulk confirm (status change or delete).

#### `DenseCard` / `DenseSkeleton` / `DenseView` — dense grid tile, its skeleton, and the dense view mode.

#### `EditModal` — edits an existing card; name is fixed/read-only.

#### `FiltersBar` — status tabs, color/mana identity, "only mine", group-by-player toggle.

#### `GridCard` / `GridSkeleton` / `GridView` — full-size grid tile, its skeleton, and the grid view mode.

#### `PrintingRow` — row content for the "Edizione" select dropdown item.

#### `SelectableImage` — shared selection-checkbox + card image used by both `GridCard` and `DenseCard`.

#### `ViewControls` — sort selector/direction toggle (grid/dense) and column-visibility menu (table).

## Composables

### associates/

#### `useAssociateFormState` — `useAssociateTypeOptions()` and `createAssociateFormState(bornDate?)`, defaults for Add/EditModal/`/tesseramento`.

#### `useAssociateMembershipEventsQuery` — reads `pauperwave_associate_membership_events` for one associate, ordered ascending.

#### `useAssociateRenewalsQuery` — full renewal history via `fetchAllRows`, staff-gated.

#### `useAssociatesBulkActions` — bulk "Rinnova" flow, creates one Association Fee transaction per associate behind an undo window.

#### `useAssociatesGeocodesQuery` — reads `pauperwave_associate_geocodes` via `fetchAllRows`, backs `MapView`.

#### `useAssociatesMutations` — `approveAssociates`, `rejectAssociates`, `approveRenewals`, `restoreAssociates`, `updateAssociate`, `updateAssociateNumber`.

#### `useAssociatesQuery` — main associates list query, reads `pauperwave_associates_with_status` view via `fetchAllRows`.

#### `useAssociatesRequestsTableColumns` — builds `requests.vue`'s column order by reordering `useAssociatesTableColumns`'s columns.

#### `useAssociatesRequestsTour` — guided-tour steps for `/associates/requests`.

#### `useAssociatesRowActions` — row context-menu builder plus edit/number/renew modal state, shared by both list pages and the detail page.

#### `useAssociatesTableColumns` — shared column-definition factory used by both list pages' column composables.

#### `useAssociatesTableSetup` — shared setup (route/router/table ref) for both list pages.

#### `useAssociatesTour` — guided-tour steps for `/associates`.

#### `useAssociateTransactionsTableColumns` — read-only transaction-history columns for the detail page.

#### `useCurrentAssociate` — resolves the `Associate` matching the logged-in Supabase user by email.

#### `usePendingRenewalRequestsQuery` — derives associate uuids with an open renewal request.

### calendar/

#### `useCalendarPageTour` — guided-tour steps for the internal `/calendar` dashboard page.

### cittadino/

#### `useCittadinoFilters` — owns format filter + best-N scoring together.

#### `useCittadinoQuery` — fetches `/api/cittadino` (mock data), keyed by edition.

#### `useCittadinoStandingsPage` — shared page-level composable for both internal and public Cittadino routes.

#### `useCittadinoTableColumns` — builds the pinned matrix `TableColumn[]`, exposes `columnAccentColors`.

### commanders/

#### `useCommanderAggregate` — aggregates pair-level `commander_stats` rows into a single-commander view.

#### `useCommanderCards` — valibot-validated mapping from `mtg_commanders` rows to `CommanderCard`.

#### `useCommanderCatalogMutations` — `syncCatalog` mutation triggering a Scryfall resync.

#### `useCommanderCatalogQuery` — full `mtg_commanders` catalog via RPC (avoids PostgREST's row cap), cached 30 days.

#### `useCommanderSearch` — client-side commander autocomplete over the cached catalog, splits "recently used" vs "all" groups.

#### `useCommanderStatsQuery` — `useAllCommanderStats()` reads the `commander_stats` view.

#### `useCommanderUsageQuery` — batch "which commanders has each player played" lookup.

#### `useCommanderWhitelists` — derives partner-eligibility whitelists from the cached catalog.

#### `useDecksFeaturingCommanderQuery` — every deck featuring a given commander in either slot.

### events/

#### `useCalendarDetail` — shared selection state for the `/calendario` page's slideover.

#### `useEventFormFields` — shared valibot schema + `EventFormState` type for Add/EditModal.

#### `useEventsBulkActions` — bulk status-change/delete over a selection, fanned out with `Promise.allSettled`.

#### `useEventsFilters` — status/date-range/name-search filtering shared by table and grid views.

#### `useEventsMutations` — `createEvent`, `updateEvent`, `setStatus`, `setImage`, `deleteEvent`.

#### `useEventsQuery` — reads the real `events` table, derives `tournamentCount` client-side. Exports `EVENTS_KEY`.

#### `useEventsRowActions` — edit-modal state shared by grid card and table actions column.

#### `useEventsTableColumns` — builds the events table's column defs.

#### `useEventsTour` — guided-tour steps for `/events`.

### finance/

#### `useFinanceSummary` — aggregates `/finance`'s many summary views purely derived from cached transactions/tournaments/events.

#### `useFinanceTour` — guided-tour steps for `/finance`.

### home/

#### `useHomeActionCounts` — pending requests, approved count, needing-renewal count, open wanted cards count.

#### `useHomeTour` — `/` home page's tour steps, switching between staff and player steps.

#### `useQuickCreateItems` — single source of truth for every "create new X" shortcut, shared by `QuickCreateMenu` and the Cmd+K palette.

### layout/

#### `useBreadcrumbs` — builds breadcrumb items from the current route path with known-segment substitution.

#### `useDashboard` — shared dashboard-shell composable: `g-x` chord shortcuts, `n` notifications toggle.

#### `useMainNavGroups` — builds the sidebar's grouped navigation items, filtered by permission.

### leagues/

#### `useLeagueFormFields` — shared valibot schema for Add/EditModal.

#### `useLeaguesBulkActions` — bulk status-change/delete over a selection.

#### `useLeaguesFilters` — status + name-substring filtering shared by table and grid.

#### `useLeaguesMutations` — `createLeague`, `updateLeague`, `setStatus`, `setRuleset`, `deleteLeague`.

#### `useLeaguesQuery` — reads leagues joined with rulesets/tournaments, derives progress/format/date-range. Exports `LEAGUES_KEY`.

#### `useLeaguesRowActions` — minimal edit-modal state.

#### `useLeaguesTableColumns` — builds the leagues table's column defs.

#### `useLeaguesTour` — guided-tour steps for `/leagues`.

### locations/

#### `useAddressGeocode` — debounced client-side geocoding via Photon, no API key.

#### `useLocationFormFields` — shared valibot schema + `buildLocationPayload` helper.

#### `useLocationsMutations` — `createLocation`, `updateLocation`.

#### `useLocationsQuery` — reads `locations` directly from Supabase. Exports `LOCATIONS_KEY`.

#### `useLocationsRowActions` — minimal edit-modal state (no delete/bulk — create+edit only).

#### `useLocationsTableColumns` — builds the locations table's column defs.

#### `useLocationsTour` — guided-tour steps for `/locations`.

### mtgFormats/

#### `useMtgFormatsMutations` — `createFormat`, `updateFormat`, `deleteFormat`.

#### `useMtgFormatsQuery` — reads `mtg_formats`, excludes soft-deleted. Exports `MTG_FORMATS_KEY`.

### organizations/

#### `useOrganizationsQuery` — reads `organizations`, reused across domains' Add modals. Exports `ORGANIZATIONS_KEY`.

### players/

#### `useCommanderDeckBracketMutation` — sets a Commander deck's bracket level.

#### `useCommanderDecksQuery` — reads a player's Commander decks directly from `commander_decks`.

#### `useCommanderMatchHistoryQuery` — player's Commander match history, merged with a separate kills query.

#### `usePlayerLoginHistoryQuery` — reads `player_login_history` (trigger-populated real table).

#### `usePlayersLastLoginsQuery` — fetches `last_sign_in_at` via a BFF endpoint (unreachable via RLS).

#### `usePlayersMutations` — `deletePlayer` (only mutation for this domain).

#### `usePlayersQuery` — reads `players_full` view. Exports `PLAYERS_KEY`.

#### `usePlayersRowActions` — right-click context menu: link to associate, copy email, promote role, delete.

#### `usePlayersTableColumns` — builds the players table's column defs.

#### `usePlayersTour` — guided-tour steps for `/players`.

### query/

#### `useQueryFreshness` — tracks `lastUpdatedAt` by watching a query's loading/status transitions.

### rulesets/

#### `useRulesetsQuery` — reads `rulesets`, used by leagues' Add modal. Exports `RULESETS_KEY`.

#### `useRulesetsTour` — guided-tour steps for `/rulesets`.

### settings/

#### `useMembersMutations` — `assignRole`, calling `supabase.rpc('assign_role', ...)` directly (SECURITY DEFINER exception to the BFF convention).

#### `useMembersQuery` — fetches the members list via a BFF endpoint.

#### `useSettingsMutations` — `updateMembershipFee`, `updateTrashRetention`, BFF-backed.

#### `useSettingsQuery` — reads the singleton `pauperwave_settings` row.

### standings/

#### `useCittadinoTour` — guided-tour steps for the internal Cittadino page.

#### `useFormatStandingsPage` — shared by `FormatPage.vue` and `PublicFormatPage.vue`.

#### `useFormatStandingsQuery` — fetches `/api/standings/<format>` (mock data).

#### `useFormatStandingsTableColumns` — builds the pinned matrix `TableColumn[]` for per-format standings.

#### `useStandingsFormatTour` — guided-tour steps for the internal per-format standings page.

### statistics/

#### `useAssociatesStatistics` — derives growth/age/renewal-timing stats from cached associates + renewals.

#### `useStatisticsTour` — guided-tour steps for `/statistics`.

#### `useTournamentsStatistics` — tournaments-per-year/by-format stats.

#### `useWantedCardsStatistics` — wanted-card status breakdown and status-over-time series.

### telegram/

#### `telegramTypes` — exports `type Player = 'me' | 'opponent'`.

#### `useExtraTurns` — state machine for the post-timer extra-turns phase (fixed 5 turns).

#### `useMatchScore` — tracks Bo3 match score, `matchWinner` computed at 2 wins.

#### `useRoundTimer` — wraps `useCountdown` for a fixed 50-minute round.

### theme/

#### `useThemeTransition` — dark/light toggle animated via View Transitions API, falls back to instant toggle on mobile/unsupported browsers.

### tour/

#### `useShortcutsTour` — 2-step tour for the "keyboard shortcuts" feature.

#### `useTourSpotlight` — computes the spotlight's tracking style for a tour's current target.

### tournaments/

#### `pairingOptimizer` — greedy multi-start + local-swap pairing optimizer with hard constraints, ported from league.

#### `useAcceptancePickerColumns` — builds `TableColumn` defs for `AcceptancePicker.vue`'s two tables.

#### `useAvoidPairsMutations` / `useAvoidPairsQuery` — global "never seat these two together" list, ported from league.

#### `useCommanderDecksByUuidsQuery` — batch commander-deck-name lookup by uuid array.

#### `useCommanderDecksMutations` — `selectCommander` get-or-create + assign mutation.

#### `useCommanderPods` — table/pod-size distribution for Commander (ideal 4/min 3).

#### `useCommanderRankingGrid` — drag-and-drop dense-rank grid state for `TableScoreGridModal.vue`.

#### `useCommanderScoring` — Commander round-scoring math (dense-to-skip-rank conversion).

#### `useCommanderStandingsSort` — tie-break comparator: score → victories → kills → brewReceived → playReceived → uuid.

#### `useDraftPods` — table/pod-size distribution for Draft's opening pod stage (ideal 8/min 6).

#### `useLiveCommanderStandings` — reactive standings recomputed from current results/kills/votes queries.

#### `useMyTournamentRegistrationMutations` / `useMyTournamentRegistrationsQuery` — player self-registration/unregistration.

#### `useOptimizationNotifier` — toast feedback wrapper around the pairing optimizer's actions.

#### `usePairingPresets` — named weight presets (social/competitive/balanced).

#### `usePairingWeights` — per-tournament localStorage persistence for pairing weight sliders.

#### `useRoundStatus` — derives the 4 round-status lists backing `RoundStatusCard.vue`.

#### `useRulesetPointsQuery` — reads the default ruleset's point values.

#### `useSwissPairing` — 1v1 table pairing for Swiss-format tournaments (Phase 1).

#### `useSwissRoundCount` — official minimum Swiss rounds by registered-player-count lookup table.

#### `useTablePairingDnd` — state/validation/scoring layer for table drag-and-drop + pairing constraints.

#### `useTournamentAwards` — end-of-tournament highlight awards computed from live standings.

#### `useTournamentContextMenuItems` — tournament-specific edit/copy/delete context-menu items.

#### `useTournamentCopyModal` — minimal ref/function trio for the "Copia torneo" action.

#### `useTournamentFormFields` — shared valibot schema + select options for Add/EditModal.

#### `useTournamentKillsMutations` / `useTournamentKillsQuery` — kill-tracking mutations and query, ported from league.

#### `useTournamentPairingResetMutation` — "Reset tavolo" and "Annulla Patta" mutations.

#### `useTournamentPairingsQuery` — fetches all `tournament_pairings` (pods) for a tournament.

#### `useTournamentPaymentsQuery` — reads a tournament's active "Tournament Fee" rows.

#### `useTournamentRegistrationsMutations` / `useTournamentRegistrationsQuery` — registration writes (optimistic) and reads.

#### `useTournamentResetMutation` — "Reset" navbar button, wipes every round/pairing/result/standing.

#### `useTournamentRoundResultsMutations` / `useTournamentRoundResultsQuery` — per-pairing placement entry and reads.

#### `useTournamentRoundsMutations` / `useTournamentRoundsQuery` — Commander round-lifecycle writes and reads.

#### `useTournamentsBulkActions` — bulk ops (status/image/entryFee/league/delete) over a selection.

#### `useTournamentsFilters` — status/format/date-range/name filtering shared by table and grid views.

#### `useTournamentsMutations` — `createTournament`, `updateTournament`, `setStatus`, `setImage`, `setEntryFee`, `setLeague`, `deleteTournament`.

#### `useTournamentsQuery` — main tournaments list query, joins locations/organizations/formats/events/leagues. Exports `TOURNAMENTS_KEY`.

#### `useTournamentsRowActions` — minimal edit-modal state for the always-visible "Modifica" button.

#### `useTournamentsTableColumns` — builds the tournaments table's column defs, with groupable columns.

#### `useTournamentStandingsQuery` — fetches persisted `tournament_standings` rows.

#### `useTournamentsTour` — guided-tour steps for `/tournaments`.

#### `useTournamentSwissRoundsMutations` — 1v1 Swiss-format equivalent of `useTournamentRoundsMutations`.

#### `useTournamentUrl` — bidirectional sync between the tournament page's URL query params and its stepper/preview-modal state.

#### `useTournamentVotesMutations` / `useTournamentVotesQuery` — brew/play voting writes and reads.

#### `useWinnerChecklist` — "Vincitori tavoli" checked-off state persistence.

### transactions/

#### `useTransactionFormFields` — derived state (options + computed flags) shared by Add/EditModal.

#### `useTransactionFormOptions` — builds select options and the full valibot schema with cross-field validation.

#### `useTransactionsBulkActions` — bulk delete/type-change over selected transactions, no undo window (financial record).

#### `useTransactionsFilters` — filtering by date range + type (including synthetic `errors`/`comped`).

#### `useTransactionsMutations` — create/update/delete, invalidating both transactions and associates keys.

#### `useTransactionsQuery` — reads `pauperwave_payments` via `fetchAllRows`, joined with associate/tournament/event.

#### `useTransactionsRowActions` — row context menu (edit/delete), no undo window.

#### `useTransactionsTableColumns` — ~18-column table defs, derives `renewalKind`.

#### `useTransactionsTour` — guided-tour steps for `/transactions`.

### trash/

#### `useTrashMutations` — `restoreItem` and `purgeItem`, invalidating every domain query key a soft-deleted entity could belong to.

#### `useTrashQuery` — fetches soft-deleted rows across all 7 soft-deletable tables, merges into one sorted list.

#### `useTrashTableColumns` — builds `/trash`'s table column defs (entity badge, days-remaining, restore/purge actions).

### ui/

#### `useRovingTabindex` — roving-tabindex arrow-key navigation for a flat, wrapping 1D group, ported from league.

#### `useSoundEffects` — wraps the `uisfx` library for synthesized UI sound cues.

### root (app/composables/)

#### `useCalendarDayHighlights` — shared logic for calendar day-dot highlighting.

#### `useChartPalette` — `CHART_PALETTE` constant + `chartColor(index)` for chart series with no domain-specific color.

#### `useChordHintKey` — reactive "key currently held" boolean for press-and-hold hints.

#### `useColumnVisibilityItems` — builds "Mostra colonne" checkbox items following Nuxt UI's official pattern.

#### `useCopyLinkContextMenu` — generic "Copia link"/"Copia ID" row context-menu builder.

#### `useCopyToClipboard` — `copyToClipboard(text, successTitle)` with toast feedback.

#### `useDeveloperView` — two independently-persisted booleans: developer view + overlay, ported from league.

#### `useEscapeToClear` — Escape-key listener clearing a selection.

#### `useFormatColor` — resolves an MTG format's tint, with hardcoded fallback map.

#### `useGroupedSelectColumn` — select/checkbox table column supporting grouped rows (tri-state).

#### `useLocationOrganizerOptions` — maps locations/organizations queries into select-option arrays.

#### `useLogout` — async logout function with toast + redirect.

#### `useModalOpenFromQuery` — implements the `?action=create` convention.

#### `usePointerReference` — virtual tooltip/popover reference that follows a pointer anchor.

#### `useRemoveConfirmFlow` — generic confirm-before-destructive-action flow driving a `ConfirmModal`.

#### `useRowContextMenu` — tracks the right-clicked row and recomputes context-menu items.

#### `useScryfallCardSearch` — live Scryfall API search (name autocomplete + printings) for the wanted-card flow.

#### `useSelectedTableRows` — resolves a selection against a table's filtered row model.

#### `useSelection` — generic `Set`-based row-selection composable with Explorer-style shift-click ranges.

#### `useStartDateField` — shared start-date field logic for events/leagues/tournaments modals.

#### `useSubmitWithToast` — generic submit wrapper (loading + success/error toast).

#### `useTableRowSelection` — row-selection + shift-click for `UTable`'s native row-selection shape.

#### `useUndoableAction` — generic 10-second "grace period" pattern for destructive actions.

#### `useUserRole` — central role/permissions composable, JWT-decoded user id, `can(permission)` helper, super-admin "view as" preview.

### wantedCards/

#### `useScryfallDragDrop` — parses a dragged Scryfall image's `dataTransfer` into card info.

#### `useWantedCardsBulkActions` — bulk status-change/delete (undoable) plus immediate copy-names/refresh-prices.

#### `useWantedCardsFilters` — status/color-identity/"only mine"/name filtering shared by table and grid.

#### `useWantedCardsMutations` — create/update/setStatus/delete/refreshPrices.

#### `useWantedCardsQuery` — reads `pauperwave_wanted_cards`, joined with player/created-by/updated-by. **Note: plain `.select()`, not `fetchAllRows`** — subject to the documented PostgREST row-cap risk.

#### `useWantedCardsRowActions` — row context menu (status, copy name, external search links, refresh prices, edit, delete).

#### `useWantedCardsTableColumns` — ~15-column table defs.

#### `useWantedCardsTour` — guided-tour steps for `/wanted-cards`.
