# Components, Composables & Pages Inventory — `league`

Full inventory of `app/components/`, `app/composables/`, and `app/pages/` in the `league` project, with a short description of what each file does. Produced as a reference snapshot while `league` is treated as abandoned in favor of `MagicTheGathering/app` — use it to compare feature coverage or port logic, not as a living doc for `league` itself.

## Pages

### `/` — `app/pages/index.vue`
- Landing/home page: title, subtitle, and a primary CTA button to `/leagues`.
- Row of secondary nav buttons (players, decks, commanders, rulesets, payments) built from a static `secondaryLinks` array.
- No data fetching — pure static content driven by i18n (`t()`) and `ICONS`. No `definePageMeta`/layout override.

### `/login` — `app/pages/login.vue`
- Simple password-gate login form (not Supabase OTP) via `usePasswordAuth()`'s `login()`.
- On success, `navigateTo` a `?redirect=` query param (defaults to `/`); on failure shows an error toast.
- Password input has show/hide and clear buttons, each wrapped with `useButtonLogging`.
- No `definePageMeta`/layout override in the file itself — auth gating lives elsewhere.

### `/commander/[commanderSlug]` — `app/pages/commander/[commanderSlug].vue`
- Detail page for a single commander card (aggregated across both slots of any partner pairing it's been played in).
- Resolves `commanderName` from the slug by scanning `useDecksQuery()` decks; loads Scryfall art/mana cost via `useCommanderCards`, aggregate stats via `useSingleCommanderStats`.
- Renders `DeckHeader`, `CommanderArtGallery`, `DeckStatsRow`, a win-rate pie chart (`BaseChart`/ECharts), and a `DeckPlayerChip` list of every deck featuring this commander, plus a Scryfall search link.
- Colada caches (`useDecksQuery`, `usePlayersQuery`), SSR-prefetched, no store/manual fetch. Explicit "not found" empty state.

### `/commanders` — `app/pages/commanders/index.vue`
- Table listing every distinct commander with mana cost/color, player count, matches, wins, kills, average score.
- Uses `useAllCommanderStats()` (gates page loading) plus `useCommanderCatalogQuery()` (loads in background, per-cell `USkeleton` while pending).
- Client-side search filter and sortable `TableColumn`s (TanStack), custom color-group-then-CMC sort for mana cost, rendered with `BaseTable`.

### `/deck/[deckSlug]` — `app/pages/deck/[deckSlug].vue`
- Detail page for a commander pairing/"deck" identified by `commander_1_name` slug (aggregated across all players who play it).
- Loads matching decks + player info (`useDecksQuery`/`usePlayersQuery`), Scryfall art for both commander slots (`useCommanderCards`), aggregate stats (`useCommanderStats`).
- Renders `DeckHeader`, per-half links to `/commander/[slug]`, `CommanderArtGallery` (dual image for partners), `DeckStatsRow`, `DeckPlayerChip` list of players using this deck, Scryfall link.
- Falls back to `DeckNotFound` when no deck matches the slug.

### `/decks` — `app/pages/decks/index.vue`
- Grid of unique commander decks (deduplicated by commander pair) with sort control (alphabetical/popularity/frequency/color/mana-cost) and direction toggle.
- Sources: `useDecksQuery()`, `useAllCommanderStats()`, `useCommandersByNamesQuery` (lazy, only when color/mana-cost sort selected).
- Renders `CommanderDeckCard` per unique deck, `CommanderDeckCardSkeleton` only on true initial load.

### `/league/[id]` — `app/pages/league/[id].vue`
- League detail page: events/tournaments list + league standings sidebar, plus tournament/league CRUD modals.
- Deliberately uses `[id]` not `[leagueId]` to avoid a Nuxt nested-route-priority conflict with the sibling tournament route (see `docs/architecture/routes.md`).
- Composes `LeagueEventsPanel` and `StandingsCard`. Modals: `TournamentFormModal`, `LeagueFormModal`, `ConfirmModal`.
- Data: `useRulesetsQuery`, `useEventsQuery(leagueId)`, `useLeagueStandingsQuery(leagueId)`, `useLeagueById(leagueId)`; tournament CRUD via `useTournamentMutations()`; league update via `useLeagueUpdate()`.

### `/league/[leagueId]/tournament/[tournamentId]` — `app/pages/league/[leagueId]/tournament/[tournamentId].vue`
- The largest/most complex page: full live tournament run/management flow (registration → playing rounds → ended), pairing, scoring, kills, votes, commander assignment, standings.
- State/logic extracted into composables: `useTournamentPage`, `useTournamentUrl`/`useTournamentUrlSync`, `useTournamentModals`, `useTournamentLifecycle`, `useTournamentPlayers`, `useTournamentSubmitHandlers`, `useTableCompletion`, `useWinners`/`useWinnerChecklist`, `useLiveStandings`, `useSessionStorePersistence`.
- Uses Pinia stores directly: `useTournamentStore`, `useRankingsStore`, `useCommandersStore`, `useKillsStore`, `useVotesStore`.
- Phase-dependent content: `WaitingList`+`CreatePlayerModal` (registration), `StandingsCard`+`TournamentAwards` (ended), or `RoundTimer`+`PairingsCard`+`RoundStatusCard`+`WinnerChecklist`+`StandingsCard` (playing), inside a `TournamentStepper`; ~10 round-action modals.
- Supports viewing/correcting past rounds and past registration snapshots as read-only overlays.

### `/leagues` — `app/pages/leagues/index.vue`
- List page for all leagues, using shared `ListPageShell`.
- Logic delegated to `useLeaguesPage()` (list, rulesets, create/delete, navigation) plus `useLeagueUpdate()` for edit.
- Renders `LeagueTable`, and in `#extra`: `LeagueFormModal` (create+edit) and `ConfirmModal` (delete).

### `/payments` — `app/pages/payments/index.vue`
- Overview/report table of every tournament registration treated as a payment record (flat €5 fee for POS/cash, free otherwise).
- Builds `allRows` by cross-joining `useLeaguesQuery`, `useAllEventsQuery`, `useAllTournamentRegistrationsQuery`, `usePlayersQuery`.
- Rich `UTable`/TanStack integration: URL-synced filters (league/tournament/format/method), sorting, pagination, global search, faceted filter options.
- Renders `RegistrationTrendChart`, `AmountByMethodChart`, `PaymentMethodMixChart` plus totals, all derived from the table's filtered/paginated row model.

### `/player/[slug]/deck/[deckSlug]` — `app/pages/player/[slug]/deck/[deckSlug].vue`
- Per-player view of one specific deck as actually played by that player (distinct from the global `/deck/[deckSlug]` aggregate page).
- Resolves player via `usePlayerBySlug(slug)`, deck via `usePlayerDecks(playerId)` matched on slug; loads per-player-per-deck stats (`useDeckStats`) and Scryfall art (`useCommanderCards`).
- Renders `DeckHeader`, `DeckStatsRow`, `CommanderArtGallery`, Scryfall link; `DeckNotFound` fallback.

### `/player/[slug]` — `app/pages/player/[slug]/index.vue`
- Player profile page: header/stats, match history, full deck management (create/edit/delete) for that player's decks.
- Data: `usePlayerBySlug`, `useCommanderDecks(playerId)`, `usePlayerStats`, `usePlayerMatchHistory`.
- Mutations via `useDeckMutations()`; delete blocked client-side if in use, server 409 mapped to a conflict message.
- Composes `PlayerProfileHeader`, `PlayerMatchHistoryTable`, `PlayerDecksSection`, `DeckEditModal`/`DeckCreateModal`/`ConfirmModal`.

### `/players` — `app/pages/players/index.vue`
- List/manage page for all players.
- Data: `usePlayersQuery`, `useDecksQuery` (per-player deck counts), `useAllPlayerStats`; filtering via `usePlayersFilter`.
- Mutations via `usePlayerMutations()`. Renders `PlayersHeader`, `PlayersToolbar`, `PlayersTable`/`PlayersEmptyState`, `CreatePlayerModal`.

### `/rulesets` — `app/pages/rulesets.vue`
- List/manage page for scoring rulesets, using `ListPageShell`.
- Logic in `useRulesetsPage()` (CRUD, in-use checks, leagues-by-ruleset lookup).
- Card grid per ruleset (rank + per-action point values), edit/delete (delete disabled if in use), "view leagues using this ruleset".
- Modals: `RulesetFormModal`, `ConfirmModal`, `LeaguesUsingRulesetModal`.

### Notes on auth/layout
None of the 14 pages contain a `definePageMeta` call, and no global auth middleware/`publicPages` allowlist was found under `app/` in this project (unlike `app`'s Supabase-based pattern). `login.vue` uses a custom `usePasswordAuth()` composable rather than Supabase OTP. No page-level layout override is evident in these files.

## Components

### charts/

#### `BaseChart` — `app/components/charts/BaseChart.vue`
- Thin wrapper around `VChart` (vue-echarts): props `option: ECOption`, `height?` (default `'18rem'`), `loading?` (default `false`).
- Sets `autoresize` and binds `:style="{ height }"` — no other logic.

### commander/

#### `CardPreview` — `app/components/commander/CardPreview.vue`
- Displays the selected commander's card art (front + back if double-faced) below `CommanderSearch`'s search box.
- Prop: `card: CommanderCard | null`. Container always rendered (opacity-toggled, not `v-if`) so the block reserves height and the modal doesn't jump.

#### `CommanderArt` — `app/components/commander/CommanderArt.vue`
- Renders a commander's art crop with a bottom gradient overlay showing name and `ManaCost` badge.
- Props: `cardName`, `artUrl: string | null`, `manaCost?`, `loading?`, `size?: 'sm' | 'base'`. Delegates the image to `ImageWithFallback`.

#### `CommanderDeckCard` — `app/components/commander/CommanderDeckCard.vue`
- Main deck card for both "aggregate" (browse-all-decks) and "player-specific" display modes.
- Props: `deck`, `playerSlug?`, `tournamentCount?`, `showActions?`, `aggregate?`. Emits `edit`/`delete`.
- Bracket badge (opens `BracketPickerModal`, saves via `useDeckMutations`), companion/lender info, aggregate/usage badges, `CommanderArt`, footer links to stats page and Scryfall.

#### `CommanderLinkTooltip` — `app/components/commander/CommanderLinkTooltip.vue`
- A `/commander/:slug` link that shows card art in a `UTooltip` on hover, fetched on-demand (`useCommanderCards`, gated on `isOpen`).
- Props: `name`, `to?`. Content wrapper always rendered so Floating UI has a stable target.

#### `CommanderModal` — `app/components/commander/CommanderModal.vue`
- Two-field commander picker (commander1 + optional partner) to assign a player's commander(s) for a round.
- Props: `playerId`, `playerName`, `commander1?`, `commander2?`, `tablePlayerIds?`. Emits `submit`.
- Uses `useCommanderWhitelists()` for partner-type rules; auto-fills exact `partner_with` pairs; blocks submit until required commander2 is picked. Exposes `{ submit, canSubmit }`.

#### `CommanderSearch` — `app/components/commander/CommanderSearch.vue`
- `USelectMenu`-based commander autocomplete wrapping `useCommanderSearch`.
- Props: `whitelist?`, `playerId?`, `tablePlayerIds?`; `v-model` selected name.
- Renders suggestions via `CommanderSuggestionRow`, shows `CardPreview` below. Auto-opens/focuses only when field starts empty.

#### `CommanderSuggestionRow` — `app/components/commander/CommanderSuggestionRow.vue`
- One dropdown row: mana-cost icons, fuzzy-match-highlighted label, hover-triggered card-image tooltip.
- Props: `label`, `tokens?`, `matchIndices?`, `imageUrl?`. Manual pointer-tracking workaround since native hover events are swallowed by the Reka listbox.

#### `CommanderVoteCard` — `app/components/commander/CommanderVoteCard.vue`
- Selectable card for one player in a deck/play vote grid, or an "assign a commander" prompt if none set.
- Props: `commanderName`, `name`, `surname`, `avatarUrl?`, `playerId?`, `selected?`, `tabindex?`. Emits `click`, `assign`, `navigate`.
- Roving-tabindex keyboard nav; resolves art/mana cost from cached catalog. Exposes `{ focus }`.

#### `ManaCost` — `app/components/commander/ManaCost.vue`
- Renders MTG mana symbols via the `mana-font` icon font. Props: `manaCost?`, `size?`.
- Parses `{X}` tokens via regex; imports `mana-font/css/mana.css` `scoped` to avoid `.ms-N` colliding with Tailwind's `ms-N` margin utility.

### deck/

#### `BracketPickerModal` — `app/components/deck/BracketPickerModal.vue`
- Modal for choosing a deck's Commander Bracket level (1–5). `v-model:open`, props `deckName`, `currentLevel?`. Emits `confirm`, `cancel`.
- Resets selection to `currentLevel` on each reopen.

#### `CommanderArtGallery` — `app/components/deck/CommanderArtGallery.vue`
- Deck detail-page hero: one or two stacked `ImageWithFallback` panes at `aspect-2/3`. Props: `image1`, `image1Alt`, `hasPartner?`, `image2?`, `image2Alt?`, `loading?`.

#### `CommanderDeckCardSkeleton` — `app/components/deck/CommanderDeckCardSkeleton.vue`
- Loading placeholder mirroring `CommanderDeckCard`'s layout via `USkeleton`, so grids don't reflow. No props.

#### `DeckCardActions` — `app/components/deck/DeckCardActions.vue`
- Edit/delete icon buttons. Props: `deck`, `isUsedInTournaments`. Emits `edit`, `delete`. Delete hidden if deck used in tournaments.

#### `DeckCreateModal` — `app/components/deck/DeckCreateModal.vue`
- Form modal to create a deck for a player. Props: `playerId`; `v-model:open`; emits `create`.
- Fields: commander1 (required), commander2, companion, borrowed switch + `useLenderSelection`. Valibot-validated (`DeckCreateSchema`).

#### `DeckEditModal` — `app/components/deck/DeckEditModal.vue`
- Form modal to edit an existing deck's ownership (borrowed/lender) and bracket level.
- Bracket level saves immediately via its own `BracketPickerModal` + `useDeckMutations().updateDeck` flow, independent of the form's own submit (`DeckUpdateSchema`).

#### `DeckHeader` — `app/components/deck/DeckHeader.vue`
- Deck detail-page title block: icon, display name, mana cost or spinner, companion badge.

#### `DeckNotFound` — `app/components/deck/DeckNotFound.vue`
- Static empty-state block for a nonexistent deck. No props.

#### `DeckPlayerChip` — `app/components/deck/DeckPlayerChip.vue`
- Link-button chip showing a deck's owning player (`PlayerNameTag`) with optional suffix and "borrowed" badge.

#### `DeckPlayVotesModal` — `app/components/deck/DeckPlayVotesModal.vue`
- Body content for round-end vote modal (two `VoteGrid`s: preferred deck, best play).
- Props: `deckVotePlayerId`, `playVotePlayerId`, `otherPlayers`, `ruleset?`. Emits `submit`, `assignCommander`. Exposes `{ submit }`.

#### `DeckStatsRow` — `app/components/deck/DeckStatsRow.vue`
- Row of 5 `StatTile`s: caller-supplied first stat plus matches/wins/kills/average.

#### `ScryfallLinkButton` — `app/components/deck/ScryfallLinkButton.vue`
- Single outlined button linking to a Scryfall URL in a new tab. Prop: `url`.

#### `VoteGrid` — `app/components/deck/VoteGrid.vue`
- Grid of `CommanderVoteCard`s for one vote category, with optional weight badge; owns roving-tabindex nav.
- Props: `label`, `weight?`, `groupAriaLabel`, `keyPrefix`, `otherPlayers`, `selectedId`. Emits `select`, `assign`.

### layout/

#### `ActionLogPanel` — `app/components/layout/ActionLogPanel.vue`
- Slideover listing every logged button click (`useActionLog()`), newest first, with "Clear". Rows expandable to reveal JSON `context`.

#### `ActionLogTrigger` — `app/components/layout/ActionLogTrigger.vue`
- Header icon button (via `DeveloperToolbarButton`) that opens `ActionLogPanel`; only rendered in developer view.

#### `AppLogo` — `app/components/layout/AppLogo.vue`
- Renders the Pauperwave logo; inverts in light mode since the asset is designed for dark backgrounds.

#### `ColorModeSwitch` — `app/components/layout/ColorModeSwitch.vue`
- Light/dark toggle using `useThemeTransition()`; wrapped in `ClientOnly` to avoid SSR mismatch.

#### `DeveloperOverlayToggle` — `app/components/layout/DeveloperOverlayToggle.vue`
- Toggles the visual developer overlay independently of developer mode; only visible while dev mode is on.

#### `DeveloperToolbarButton` — `app/components/layout/DeveloperToolbarButton.vue`
- Shared shell for a header icon button that only renders in developer view (`ClientOnly` + `UTooltip` + `UButton`).
- Props: `icon`, `color?`, `variant?`, `buttonAriaLabel`. Emits `click`. Used by `ActionLogTrigger`/`DeveloperOverlayToggle`.

#### `DeveloperViewToggle` — `app/components/layout/DeveloperViewToggle.vue`
- Toggles app-wide developer view (`useDeveloperView()`). Enabling requires a popover password prompt (hardcoded speed bump, not real auth).

#### `HeaderActions` — `app/components/layout/HeaderActions.vue`
- Pure composition wrapper grouping header buttons: `DeveloperViewToggle`, `DeveloperOverlayToggle`, `ActionLogTrigger`, `ColorModeSwitch`, `LogoutButton`.

#### `LogoutButton` — `app/components/layout/LogoutButton.vue`
- Icon button calling `usePasswordAuth().logout()`, logged via `useButtonLogging`.

#### `VersionBadge` — `app/components/layout/VersionBadge.vue`
- Fixed bottom-left badge showing `appEnv` and `v{appVersion}` from runtime config. No commit-hash display (unlike `app`'s sibling component).

### league/

#### `LeagueEventsPanel` — `app/components/league/LeagueEventsPanel.vue`
- League detail view: back button, name header with edit, "new tournament" button, `TournamentsTable`, `TournamentRanking`.
- Props: `leagueId`, `currentLeague?`, `events?`, `eventsLoading?`. Emits `editLeague`, `createTournament`, `viewTournament`, `editTournament`, `deleteTournament`.

#### `LeagueFormModal` — `app/components/league/LeagueFormModal.vue`
- Create/edit modal for a league (`FormModal` + `useFormModalMeta`). Fields: name, start/end dates, ruleset, valid-tournaments count, (edit-only) status.
- Props: `league`, `rulesets`, `rulesetsLoading?`. Emits `create`/`update`.

#### `LeaguesUsingRulesetModal` — `app/components/league/LeaguesUsingRulesetModal.vue`
- Read-only modal listing leagues using a given ruleset, each row linking to `/league/{id}`.
- Props: `rulesetId`, `rulesetName`, `getLeaguesByRuleset`. Emits `navigate`.

#### `LeagueTable` — `app/components/league/LeagueTable.vue`
- `BaseTable`-backed table of leagues: id, name, dates, status badge, ruleset name, row-actions (`RowActionButtons`).
- Props: `leagues`, `rulesets`, `loading?`. Emits `view`, `edit`, `delete`. Row tint by status; default sort by `starts_at`.

### payments/

#### `AmountByMethodChart` — `app/components/payments/AmountByMethodChart.vue`
- Bar chart of euros collected by POS vs. Cash (omaggio/free always €0, excluded). Prop: `rows: PaymentRow[]`.

#### `PaymentMethodMixChart` — `app/components/payments/PaymentMethodMixChart.vue`
- Donut/pie chart of registrant headcount split by payment method. Prop: `rows: PaymentRow[]`.

#### `RegistrationTrendChart` — `app/components/payments/RegistrationTrendChart.vue`
- Line/area chart of registration count per tournament, ordered chronologically. Prop: `rows: PaymentRow[]`.

#### `PaymentRow` (types) — `app/components/payments/types.ts`
- Shared TS interface, one row per tournament registration, denormalized with player/tournament/league context. Consumed by `/payments` and the three chart components.

### player/

#### `CreatePlayerModal` — `app/components/player/CreatePlayerModal.vue`
- Thin `FormModal` wrapper for player create/edit; wires `useFormModalMeta` and forwards `PlayerCreateForm`'s events.
- Props: `player`, `existingPlayers`, `context: 'tournament' | 'players'`. `v-model:open`.

#### `PlayerActiveFilterSwitch` — `app/components/player/PlayerActiveFilterSwitch.vue`
- `USwitch` for "show only active players", reading counts from `usePlayersQuery()`. `v-model` boolean.

#### `PlayerCreateForm` — `app/components/player/PlayerCreateForm.vue`
- Create/edit form: first/last name, MTG format multi-select, active switch; valibot-validated.
- In creation mode, runs fuzzy-name similarity check against `existingPlayers`, showing a warning with select/search action.

#### `PlayerDecksSection` — `app/components/player/PlayerDecksSection.vue`
- Card section on player profile listing decks via `CommanderDeckCard`; skeleton only on true initial load.
- Props: `loading`, `decks`, `slug`, `getTournamentCount`. Emits `addDeck`, `edit`, `delete`.

#### `PlayerFilterSwitch` — `app/components/player/PlayerFilterSwitch.vue`
- `USwitch` for "show only players with decks", cross-referencing players/decks caches.

#### `PlayerMatchHistoryTable` — `app/components/player/PlayerMatchHistoryTable.vue`
- Plain HTML table of match history (date, tournament link, round, table, commander(s), position, kills), grouped by date with border separators.

#### `PlayerNameTag` — `app/components/player/PlayerNameTag.vue`
- Renders `name surname` with optional deterministic avatar, optionally as a link to `/player/<slug>`.
- Props: `name`, `surname`, `avatarUrl?`, `playerId?`, `showAvatar?`, `linkable?`, `wrap?`, `avatarSize?`, `muted?`.

#### `PlayerProfileHeader` — `app/components/player/PlayerProfileHeader.vue`
- Profile header: name tag + ID, stat bar (`StatTile`s), owned/borrowed deck count.

#### `PlayersEmptyState` — `app/components/player/PlayersEmptyState.vue`
- Config-driven empty-state block by `type` (no-search-results / no-decks-filter / no-active-filter / no-players).

#### `PlayersHeader` — `app/components/player/PlayersHeader.vue`
- `/players` page header: breadcrumb, "new player" button, subtitle with total/active counts. Emits `createPlayer`.

#### `PlayersTable` — `app/components/player/PlayersTable.vue`
- `BaseTable`-backed players table: selection, ID, avatar, name (link), surname, deck count, per-stat sortable columns, format badges, active badge, row actions.
- Props: `players`, `getPlayerStat`, `getDeckCount`. Emits `edit`. `v-model:rowSelection`.

#### `PlayersToolbar` — `app/components/player/PlayersToolbar.vue`
- Toolbar combining search input with `PlayerFilterSwitch` and `PlayerActiveFilterSwitch`.

### ruleset/

#### `RulesetFieldGrid` — `app/components/ruleset/RulesetFieldGrid.vue`
- Reusable 4-column grid of labeled `UInputNumber` fields for a ruleset field group. Props: `headingIcon`, `headingText`, `items`, `form`. Emits `updateField`.

#### `RulesetFormModal` — `app/components/ruleset/RulesetFormModal.vue`
- Create/edit modal for scoring rulesets; two valibot schemas (create requires all fields, update allows nullable). Uses `useFormModalMeta` + `RulesetFieldGrid` (x2).

### standings/

#### `StandingsCard` — `app/components/standings/StandingsCard.vue`
- Collapsible standings display: rank badges (top-8 gold), name tags, total score, copy-to-clipboard, fullscreen mode.
- Props: `standings`, `loading?`, `title?`, `submittedByPlayerId?`. In fullscreen + dev-view, shows per-player breakdown.

### tournament/ (root)

#### `CurrentTime` — `app/components/tournament/CurrentTime.vue`
- Live clock (HH:MM), ticking every second; used inside `RoundTimer`'s fullscreen mode.

#### `EndedTournamentBadge` — `app/components/tournament/EndedTournamentBadge.vue`
- Single centered neutral badge marking the "ended" phase, shown above final standings.

#### `RoundTimer` — `app/components/tournament/RoundTimer.vue`
- 3-phase countdown for a round (pre/round/turns), auto-cascading phases, single-click start.
- Props: `durationMinutes`, `round`. Emits `expired`.
- Persists phase/timestamp/bonus to localStorage keyed by round so refresh resumes correctly; pause/resume, reset, fullscreen, skip-pre, force-end, add/subtract minutes, all logged.

#### `StartTournamentButton` — `app/components/tournament/StartTournamentButton.vue`
- Fixed-width primary "Avvia Evento" button. Props: `disabled`, `loading`.

#### `TimerControlButton` — `app/components/tournament/TimerControlButton.vue`
- Reusable control button for `RoundTimer`; tooltip variant outside fullscreen, oversized+title-attr variant inside.
- Props: `icon`, `color`, `variant`, `tooltip`, `fullscreen`, `disabled?`, `label?`. Emits `click`.

#### `TournamentActionBar` — `app/components/tournament/TournamentActionBar.vue`
- Primary action buttons depending on tournament status (start / cancel-round / advance-or-end / correct-last-round).
- Props: `currentRound`, `totalRounds`, `tournamentStatus`, `canStartTournament`, `canAdvance`. Emits `start`, `cancelRound`, `advance`, `end`, `correctLastRound`.

#### `TournamentAwardCard` — `app/components/tournament/TournamentAwardCard.vue`
- One flavor award card (victim/killer/brewer/player) with fixed Scryfall art per kind, badge, winning player's name + stat.
- Props: `kind`, `playerId`, `playerName`, `playerSurname`, `value`.

#### `TournamentAwards` — `app/components/tournament/TournamentAwards.vue`
- Grid of `TournamentAwardCard`s computed from `useTournamentAwards`. Props: `standings`, `victimCounts`.

#### `TournamentHeaderCard` — `app/components/tournament/TournamentHeaderCard.vue`
- Header showing name, edit button, status badge, date. Props: `tournamentName`, `tournamentDate`, `tournamentStatus`. Emits `edit`.

#### `TournamentRanking` — `app/components/tournament/TournamentRanking.vue`
- Aggregated cross-tournament league ranking: fetches tournaments + standings, sums per-player score/victories/kills/brew/play, renders players × tournaments matrix with total column. Prop: `leagueId`.

#### `TournamentStepper` — `app/components/tournament/TournamentStepper.vue`
- (Documented via tournament page usage) Phase stepper for registration/playing/ended flow.

#### `TournamentsTable` — `app/components/tournament/TournamentsTable.vue`
- (Documented via league page usage) Table listing a league's tournaments/events.

#### `WinnerChecklist` — `app/components/tournament/WinnerChecklist.vue`
- (Documented via tournament page usage) Checklist for marking round-1 winners' booster hand-over, backed by `useWinnerChecklist`.

### tournament/modal/

#### `NextRoundModal` — `app/components/tournament/modal/NextRoundModal.vue`
- Simple confirm modal asking to advance to the next round. `v-model:open`. Emits `confirm`.

#### `TournamentCommanderModal` — `app/components/tournament/modal/TournamentCommanderModal.vue`
- Wraps `CommanderModal` in a `UModal`; footer has a "refresh commander catalog" action (Scryfall sync) behind its own `ConfirmModal`.
- Props: `showCommanderModal`, `selectedPlayerId`, `getPlayerName`, `getPlayer`, `commandersStore`, `tablePlayerIds?`. Emits `submit`, `cancel`.

#### `TournamentFormModal` — `app/components/tournament/modal/TournamentFormModal.vue`
- Create/edit form for a tournament (name, date, round count/duration, format), valibot-validated.
- Props: `tournament` (null = create), `leagueId`. Emits `create`, `update` — exports the shared payload interfaces.

#### `TournamentKillModal` — `app/components/tournament/modal/TournamentKillModal.vue`
- Thin wrapper around `KillSystemModal`. Props: `showKillModal`, `selectedKillPlayers`, `selectedKillPairingId`. Emits `submit`, `close`.

#### `TournamentScoreModal` — `app/components/tournament/modal/TournamentScoreModal.vue`
- Wraps `TableScoreGrid` in a `UModal` for entering a table's ranking/results. Emits `submit`, `cancel`.

#### `TournamentScoresModal` — `app/components/tournament/modal/TournamentScoresModal.vue`
- Read-only wrapper around `TableScoresModal`, showing already-entered scores. Emits `cancel`.

#### `TournamentVotesModal` — `app/components/tournament/modal/TournamentVotesModal.vue`
- Wraps `DeckPlayVotesModal` in a `UModal`. Custom autofocus + tab-order trick so Tab reaches Save before Cancel. Emits `submit`, `cancel`, `assignCommander`.

### tournament/round-status/

#### `RoundStatusCard` — `app/components/tournament/round-status/RoundStatusCard.vue`
- Collapsible sidebar summarizing round-entry progress across 4 categories via `useRoundStatus`; rows clickable to jump to the matching modal.
- Props: `pairings`, `tournamentPlayers`. Emits `openScoreModal`, `openKillModal`, `openCommanderModal`, `openVotesModal`. All/pending/done filters + fuzzy search.

#### `RoundStatusRow` — `app/components/tournament/round-status/RoundStatusRow.vue`
- Generic clickable row (table label or `PlayerNameTag`) with a done/pending icon. Emits `select`.

#### `RoundStatusSection` — `app/components/tournament/round-status/RoundStatusSection.vue`
- Generic collapsible sub-card (chevron, progress bar, counter) wrapping a slot of rows. Props: `title`, `icon`, `doneCount`, `totalCount`, `forceOpen?`.

### tournament/waiting/

#### `LastTournamentParticipantsTable` — `app/components/tournament/waiting/LastTournamentParticipantsTable.vue`
- Table of the league's last-ended-tournament participants, each row with an "add to waiting list" button; return-rate gauge badge in header.

#### `TournamentRegistrationTable` — `app/components/tournament/waiting/TournamentRegistrationTable.vue`
- Read-only table of a past/current registration list: index, player, registered-at, payment method badge.

#### `WaitingList` — `app/components/tournament/waiting/WaitingList.vue`
- Top-level waiting-list panel: optional `LastTournamentParticipantsTable`, `WaitingListStats`, `WaitingListTable`, "add players"/"create new player" controls.
- Persists per-player payment-method flags via `useWaitingListFlags(tournamentId)`.

#### `WaitingListStats` — `app/components/tournament/waiting/WaitingListStats.vue`
- Badge summarizing waiting-list size and table-split estimate, debounced 500ms. Props: `playerCount`, `tableEstimate?`.

#### `WaitingListTable` — `app/components/tournament/waiting/WaitingListTable.vue`
- Full waiting-list table: fuzzy search, shift-click range-select, payment-method toggles, batch mark-paid/remove, edit/remove per row.

### tournament/pairing/ (root)

#### `PairingsCard` — `app/components/tournament/pairing/PairingsCard.vue`
- Editable round view: grid of table cards with per-table actions, plus reset/test-fill/fill-all/draw/undraw confirm dialogs.
- Props: `pairings`, `readonly?`, `allPlayers`. Emits `openScoreModal`, `openCommanderModal`, `openScoresModal`, `openVotesModal`, `openKillModal`, `resetTable`, `draw`, `undraw`, `refreshPairings`.
- Injects rankings/commanders/kills/votes/tournament Pinia stores directly. Toggles to `PairingsFullscreenView`.

#### `PairingsFullscreenView` — `app/components/tournament/pairing/PairingsFullscreenView.vue`
- Read-only big-display readout of the round's tables. Props: `pairings`, `allPlayers`. Emits `exit`. Uses container queries for text scaling.

### tournament/pairing/kill/

#### `KillFlowCanvas` — `app/components/tournament/pairing/kill/KillFlowCanvas.vue`
- Vue Flow canvas drawing kill connections between draggable-disabled `KillPlayerNode`s. Prop: `players`. Writes directly to `killsStore`.

#### `KillLoopbackEdge` — `app/components/tournament/pairing/kill/KillLoopbackEdge.vue`
- Custom Vue Flow edge for suicide kills (node's own bottom→top handle); routes around degenerate straight-line case.

#### `KillPlayerNode` — `app/components/tournament/pairing/kill/KillPlayerNode.vue`
- Custom Vue Flow node: player chip with source/target handles; floating toolbar shows kill/death/suicide badges.

#### `KillSystemModal` — `app/components/tournament/pairing/kill/KillSystemModal.vue`
- Modal hosting `KillFlowCanvas` plus a removable kill list and reset; re-hydrates `killsStore` from DB on open, reverts on cancel.
- Props: `players`, `pairingId`; `open` v-model. Emits `submit`.

### tournament/pairing/settings/

#### `ForbiddenPairsSection` — `app/components/tournament/pairing/settings/ForbiddenPairsSection.vue`
- Form section for adding/removing "forbidden pair" seating constraints, plus a "resolve conflicts" button.

#### `PairingPresetButtons` — `app/components/tournament/pairing/settings/PairingPresetButtons.vue`
- Button group for selecting a pairing-weight preset (social/balanced/competitive), reset button, custom indicator. Exports `PairingPresetKind`.

#### `PairingSettingsModal` — `app/components/tournament/pairing/settings/PairingSettingsModal.vue`
- Top-level modal composing `PairingWeightsSection` + `ForbiddenPairsSection`; single close footer (all changes write live).

#### `PairingWeightsSection` — `app/components/tournament/pairing/settings/PairingWeightsSection.vue`
- Weight-tuning form: `PairingPresetButtons` + grid of `UInputNumber` sliders + formula display. Emits `selectPreset`, `updateWeight`.

### tournament/pairing/table/ (root)

#### `PairingActionButton` — `app/components/tournament/pairing/table/PairingActionButton.vue`
- Shared tooltip + outline-button shape behind `PairingTableActions`' three action buttons.

#### `PairingPlayerRow` — `app/components/tournament/pairing/table/PairingPlayerRow.vue`
- One player row in a pairing card: name tag + commander/vote toggle buttons (hidden when readonly).

#### `PairingTableActions` — `app/components/tournament/pairing/table/PairingTableActions.vue`
- Footer action row for a table card: ranking, kills, draw buttons. Ranking/kills disable while drawn; draw toggle only allowed on empty/undo.

#### `TableCard` — `app/components/tournament/pairing/table/TableCard.vue`
- One table's seat grid in the drag-and-drop preview editor (`vue-draggable-plus`). `seatsModel` wraps `table.seats` directly (required for cross-table drag to work).

#### `TableCardActions` — `app/components/tournament/pairing/table/TableCardActions.vue`
- Header action row for a `PairingsCard` pairing: heading, view-scores, reset, quick-fill, `TableStateBadge`.

#### `TablePlayerReceiptCard` — `app/components/tournament/pairing/table/TablePlayerReceiptCard.vue`
- Per-player score-breakdown "receipt" (strength balance, novelty, rematch penalty, rotate-table3 cost, total).

#### `TableReceiptSummary` — `app/components/tournament/pairing/table/TableReceiptSummary.vue`
- Table-level counterpart to `TablePlayerReceiptCard`: aggregated score components + total.

#### `TableSeatItem` — `app/components/tournament/pairing/table/TableSeatItem.vue`
- One seat cell: occupied (drag handle, `PlayerNameTag`, seed badge, commander toggle) or empty placeholder. Used by both `TableCard` and `TableScoreGrid`.

#### `TableStateBadge` — `app/components/tournament/pairing/table/TableStateBadge.vue`
- Tooltip + badge showing complete/in-progress state.

### tournament/pairing/table/preview/

#### `TablePreviewGrid` — `app/components/tournament/pairing/table/preview/TablePreviewGrid.vue`
- Responsive grid of `TableCard`s, forwarding per-table getter functions.

#### `TablePreviewModal` — `app/components/tournament/pairing/table/preview/TablePreviewModal.vue`
- Main table-preview/editing modal composing `TablePreviewToolbar`, `TablePreviewGrid`, `PairingSettingsModal`, `TableScoreBreakdownModal` around `useTableDnd`/`usePairingPresets`/`useOptimizationNotifier`.
- Auto-runs optimizer once per modal-open (including round 1, deliberately). Forbidden pairs are global DB state, synced via watcher.

#### `TablePreviewToolbar` — `app/components/tournament/pairing/table/preview/TablePreviewToolbar.vue`
- Toolbar: total score, "weights & constraints", "optimize", "random" buttons.

### tournament/pairing/table/score/

#### `TableScoreBreakdownModal` — `app/components/tournament/pairing/table/score/TableScoreBreakdownModal.vue`
- Shows a table's full score breakdown: `TableReceiptSummary` + `TablePlayerReceiptCard` grid.

#### `TableScoreGrid` — `app/components/tournament/pairing/table/score/TableScoreGrid.vue`
- Drag-and-drop ranking entry grid (3x3/4x4), backed by `useRankingGrid`, reusing `TableSeatItem`. Emits `submit`, `cancel`.

#### `TableScoresModal` — `app/components/tournament/pairing/table/score/TableScoresModal.vue`
- Despite the name, a plain `UTable` of a pairing's final score breakdown per player. Highlights "unspecified" score components.

### ui/actions/

#### `QuickFillButton` — `app/components/ui/actions/QuickFillButton.vue`
- Dev-only "fill with test data" trigger; renders nothing unless developer view is enabled.

#### `RowActionButton` — `app/components/ui/actions/RowActionButton.vue`
- Single icon button for one row action (`edit`/`view`/`remove`), styled from `ACTION_MAP`.

#### `RowActionButtons` — `app/components/ui/actions/RowActionButtons.vue`
- Groups up to three `RowActionButton`s; wraps handlers with `useButtonLogging` and stops click propagation.

### ui/display/

#### `BaseTable` — `app/components/ui/display/BaseTable.vue`
- Generic wrapper around `UTable` with shared loading/empty-state slots and consistent borders. `v-model:rowSelection` opt-in.

#### `ImageWithFallback` — `app/components/ui/display/ImageWithFallback.vue`
- Renders `<img>` if `src` set, else spinner or missing-image placeholder.

#### `StatTile` — `app/components/ui/display/StatTile.vue`
- Small icon + value + label stat card. Props: `icon`, `value`, `label`, `color?`, `background?`.

### ui/input/

#### `DatePicker` — `app/components/ui/input/DatePicker.vue`
- Labeled date picker on `UPopover`+`UCalendar` using `CalendarDate`; `it-IT` long-format display, clear button, "today" shortcut.

#### `SearchInput` — `app/components/ui/input/SearchInput.vue`
- `UInput` preconfigured with search icon and clear button shown once text is entered.

### ui/layout/

#### `ListPageShell` — `app/components/ui/layout/ListPageShell.vue`
- Standard list-page chrome: breadcrumb, `PageHeaderRow` with add button, error alert, loading spinner, content slot, `extra` slot.

#### `PageHeaderRow` — `app/components/ui/layout/PageHeaderRow.vue`
- Header row: home back-button, centered title, default slot for right-side actions.

### ui/modal/

#### `CancelButton` — `app/components/ui/modal/CancelButton.vue`
- Standard neutral cancel button, click-logged.

#### `ConfirmButton` — `app/components/ui/modal/ConfirmButton.vue`
- Standard primary confirm button; supports both imperative click and native form submission.

#### `ConfirmModal` — `app/components/ui/modal/ConfirmModal.vue`
- Generic destructive-action confirmation dialog with warning title, question/subject/warning body, confirm/cancel footer.
- Prop `portal?` (default `true`; set `false` inside Fullscreen-API elements, e.g. `RoundTimer`).

#### `FormModal` — `app/components/ui/modal/FormModal.vue`
- Generic form-modal wrapper: icon+title header, body slot, footer submitting a named form.

#### `ModalFooterActions` — `app/components/ui/modal/ModalFooterActions.vue`
- Reusable modal/form footer: optional `start` slot + Cancel/Confirm button pair.

## Composables

### charts/

#### `useChartTheme` — `app/composables/charts/useChartTheme.ts`
- Supplies ECharts-compatible theme colors (text, axis lines, tooltip, 8-slot palette), reactive to `useColorMode()`. Returns `{ isDark, colors, tooltipTheme }`.

### commanders/

#### `useCommanderAggregate` — `app/composables/commanders/useCommanderAggregate.ts`
- `aggregateSingleCommander`: rolls up pair-level `commander_stats` rows into a single-commander summary. `getAllCommanderNames`, `useSingleCommanderStats`.

#### `useCommanderCards` — `app/composables/commanders/useCommanderCards.ts`
- `CommanderCard` schema + `mtg_commanders` row mapping. `fetchCommandersByNames`/`useCommandersByNamesQuery`, `useCommanderCards(commander1Name, commander2Name)` (main public API), `getArtCrop`.

#### `useCommanderCatalogQuery` — `app/composables/commanders/useCommanderCatalogQuery.ts`
- Fetches the entire commander catalog via `supabase.rpc('get_commander_catalog')`, cached 30 days. Backing source for search/whitelists/vote cards.

#### `useCommanderDecks` — `app/composables/commanders/useCommanderDecks.ts`
- Combines a player's decks with tournament usage counts; exposes `isDeckInUse`, `getDeckTournamentCount`.

#### `useCommanderSearch` — `app/composables/commanders/useCommanderSearch.ts`
- Powers `CommanderSearch`: filters cached catalog client-side, fuzzy-matches, splits into "recently used by this player" and "all commanders" groups, debounced 150ms. Batches usage lookups via `useCommanderUsageQuery`.

#### `useCommanderStats` — `app/composables/commanders/useCommanderStats.ts`
- `useCommanderStats(pair)` single-pair aggregate row; `useAllCommanderStats()` full table for listings/aggregation.

#### `useCommanderUsageQuery` — `app/composables/commanders/useCommanderUsageQuery.ts`
- Batch-fetches "which commanders has each player played" for a list of player ids in one request. Returns nested `Map`.

#### `useCommanderWhitelists` — `app/composables/commanders/useCommanderWhitelists.ts`
- Derives partner-eligibility whitelists from the cached catalog. `getPartnerType`, `getAllowedPartners`, `getExactPartnerName`. Backs `CommanderModal`.

#### `useDeckStats` — `app/composables/commanders/useDeckStats.ts`
- A player's denormalized stats for one commander pair from `deck_stats`.

### deck/

#### `useDeckDisplay` — `app/composables/deck/useDeckDisplay.ts`
- Given a reactive deck, returns `commanderDisplayName` and `scryfallSearchUrl`.

#### `useDeckMutations` — `app/composables/deck/useDeckMutations.ts`
- Colada mutations for deck CRUD via BFF endpoints; invalidates deck + usage caches `onSettled`.

#### `useDecksQuery` — `app/composables/deck/useDecksQuery.ts`
- `useDecksQuery()` — source-of-truth query for all decks. `usePlayerDecks(playerId)` — filters client-side.

#### `useLenderSelection` — `app/composables/deck/useLenderSelection.ts`
- Shared borrowed-deck/lender-picker state used by `DeckCreateModal`/`DeckEditModal`.

### auth/

#### `usePasswordAuth` — `app/composables/auth/usePasswordAuth.ts`
- Wraps `nuxt-auth-utils`' `useUserSession()` for site-wide password auth. `login(password)`, `logout()`, exposes `isAuthenticated`.

### avoid-pairs/

#### `useAvoidPairsMutations` — `app/composables/avoid-pairs/useAvoidPairsMutations.ts`
- `addAvoidPair`/`removeAvoidPair` mutations via BFF endpoints, invalidating `AVOID_PAIRS_KEY`.

#### `useAvoidPairsQuery` — `app/composables/avoid-pairs/useAvoidPairsQuery.ts`
- Query reading the global `player_avoid_pairs` table. Single source of truth for pairing constraints (replaces legacy per-tournament localStorage mechanism).

### league/

#### `useLeagueMutations` — `app/composables/league/useLeagueMutations.ts`
- `createLeague`/`updateLeague`/`deleteLeague` via BFF, invalidating `LEAGUES_KEY`. Exports `LeagueStatus`, `LeagueFormPayload`, `LeagueUpdatePayload`.

#### `useLeaguesPage` — `app/composables/league/useLeaguesPage.ts`
- Orchestrates `/leagues`: combines leagues/rulesets queries with create/delete modal state and toast-driven handlers.

#### `useLeaguesQuery` — `app/composables/league/useLeaguesQuery.ts`
- Query for all leagues ordered by `starts_at` desc. Also exports `useLeagueById`.

#### `useLeagueStandingsQuery` — `app/composables/league/useLeagueStandingsQuery.ts`
- League-wide and multi-tournament standings aggregation. `sumPointBreakdowns`/`aggregateLeagueStandings` pure functions (previously a bug silently dropped kills/placement points, fixed 2026-07-31). `useLeagueStandingsQuery`, `useMultipleEventStandingsQuery`.

#### `useLeagueUpdate` — `app/composables/league/useLeagueUpdate.ts`
- Shared league-edit submit handler used by both leagues list and league detail pages.

### players/

#### `usePlayerBySlug` — `app/composables/players/usePlayerBySlug.ts`
- Resolves a `Player` from cached list by matching slug. Returns `{ player, playerId }`.

#### `usePlayerMatchHistory` — `app/composables/players/usePlayerMatchHistory.ts`
- `fetchPlayerMatchHistory` queries `round_results` joined to pairings/tournaments; `usePlayerMatchHistory(playerId)` Colada wrapper.

#### `usePlayerMutations` — `app/composables/players/usePlayerMutations.ts`
- `createPlayer`/`updatePlayer` via BFF; no delete (players referenced everywhere).

#### `usePlayersFilter` — `app/composables/players/usePlayersFilter.ts`
- Search/filter logic for player list: search query, deck filter, active filter, computed `filteredPlayers` + `emptyState` discriminant.

#### `usePlayersQuery` — `app/composables/players/usePlayersQuery.ts`
- Query for all players ordered by name. `sanitizePlayer` (underscore→space name fix), `usePlayerOptions`.

#### `usePlayerStats` — `app/composables/players/usePlayerStats.ts`
- `usePlayerStats(playerId)` single row; `useAllPlayerStats()` full table + `getStat` lookup helper.

### ruleset/

#### `useRulesetMutations` — `app/composables/ruleset/useRulesetMutations.ts`
- `createRuleset`/`updateRuleset`/`deleteRuleset` via BFF, invalidating `RULESETS_KEY`.

#### `useRulesetsPage` — `app/composables/ruleset/useRulesetsPage.ts`
- Orchestrates `/rulesets`: rulesets + leagues queries, `leaguesMap`, modal/selection state, CRUD handlers with toasts.

#### `useRulesetsQuery` — `app/composables/ruleset/useRulesetsQuery.ts`
- Query reading the full `rulesets` table ordered by id. Exports `RULESETS_KEY`.

### supabase/

#### `useStatsQueryBuilder` — `app/composables/supabase/useStatsQueryBuilder.ts`
- `applyCommander2Filter(query, commander2Name)`: applies `.eq`/`.is(null)` correctly for Postgres NULL semantics.

### tables/

#### `useRankingGrid` — `app/composables/tables/useRankingGrid.ts`
- Drag-and-drop state/logic for the table-score ranking grid; validates consecutive rank formation. Exposes grid state, drag handlers, extraction helpers.

#### `useTableCalculator` — `app/composables/tables/useTableCalculator.ts`
- Pure sizing math for splitting a player count into 3/4-seat tables: `calculateTables`, `getTableSizes`, `buildPreviewTables`, `formatTableEstimate`.

#### `useTableDnd` — `app/composables/tables/useTableDnd.ts`
- Manages drag-and-drop table/seat editing, validation, live scoring, layered on `pairingOptimizer`. Scoring inputs deliberately `MaybeRefOrGetter`.

#### `useTableUtils` — `app/composables/tables/useTableUtils.ts`
- Grab-bag of shared table helpers: date formatting, cell renderers, sort headers, TanStack column factories.

### theme/

#### `useThemeTransition` — `app/composables/theme/useThemeTransition.ts`
- Dark/light toggle animated via View Transitions API (expanding clip-path from click position), instant fallback otherwise. Returns `isDark`, `toggleTheme`.

### event-pairing/

#### `pairingOptimizer` — `app/composables/event-pairing/pairingOptimizer.ts`
- Core pairing/scoring engine (plain functions, not a composable): multi-start greedy construction + local-swap search within a time budget.
- Scoring dimensions: strength balance, novelty, rematch penalty (in-tournament + cross-tournament with recency decay), 3-player-table rotation penalty, table-size preference. Public API: `optimizePairings`, `scorePairingTables`, `getForbiddenPairKey`, `normalizePairingForbiddenPairs`, `DEFAULT_PAIRING_WEIGHTS`.

#### `pairingPreferences` — `app/composables/event-pairing/pairingPreferences.ts`
- localStorage persistence of a tournament's custom `PairingWeights`, keyed per-tournament. `getPairingWeights`, `savePairingWeights`.

### ui/

#### `useActionLog` — `app/composables/ui/useActionLog.ts`
- Persisted, capped (250) ring buffer of button-click actions for the dev action log panel; module-scope singleton `Ref` shared across instances.

#### `useBreadcrumb` — `app/composables/ui/useBreadcrumb.ts`
- Prepends a shared "home" crumb to a page's trailing breadcrumb segments.

#### `useButtonLogging` — `app/composables/ui/useButtonLogging.ts`
- Per-button click logger: `logClick()` console-logs and records via `useActionLog().recordEntry`. Context values may be thunks.

#### `useFormModalMeta` — `app/composables/ui/useFormModalMeta.ts`
- Shared create/edit modal chrome (title/description/icon/submitLabel derived from `isEditing` + i18n namespace) plus logged `handleCancel`.

#### `useRovingTabindex` — `app/composables/ui/useRovingTabindex.ts`
- Roving-tabindex arrow-key navigation for a focusable group (flat 1D, not true 2D since column count is responsive).

#### `useSoundEffects` — `app/composables/ui/useSoundEffects.ts`
- Wraps the `uisfx` library for synthesized UI sound cues; module-scope singleton player, lazily created client-side.

### tournament/

#### `useLiveStandings` — `app/composables/tournament/useLiveStandings.ts`
- Real-time in-progress standings during a `'playing'` tournament, re-derived per pairing from live session stores without waiting for a DB round close.

#### `useOptimizationNotifier` — `app/composables/tournament/useOptimizationNotifier.ts`
- Wraps the pairing optimizer with toast notifications: `optimizeNow()`, `autoResolveConflicts()` (restores snapshot if result invalid/no improvement).

#### `usePairingPresets` — `app/composables/tournament/usePairingPresets.ts`
- Manages named pairing-weight presets (balanced/social/competitive/custom); detects match via float-tolerant comparison.

#### `usePlayerDisplay` — `app/composables/tournament/usePlayerDisplay.ts`
- `playerDisplayName(player)`: splits a full name into first-name/surname when it ends with the known surname.

#### `useRoundStatus` — `app/composables/tournament/useRoundStatus.ts`
- Derives the 4 lists backing `RoundStatusCard`'s sidebar, using `useTableCompletion`'s predicates so sidebar and table cards agree on "done".

#### `useSessionStorePersistence` — `app/composables/tournament/useSessionStorePersistence.ts`
- Mirrors the four in-round session stores to localStorage per tournament+round (TTL 12h), as crash insurance ahead of a future DB+Realtime entry system.

#### `useTableCompletion` — `app/composables/tournament/useTableCompletion.ts`
- Shared "is this done" predicates for a pairing/table (`hasRanking`, `hasKills`, `isDraw`, `isTableComplete`). Single source of truth reused across the tournament UI.

#### `useTournamentAwards` — `app/composables/tournament/useTournamentAwards.ts`
- Computes end-of-tournament highlight awards (victim/killer/brewer/player), each the single top scorer, omitted if 0 for everyone.

#### `useTournamentLifecycle` — `app/composables/tournament/useTournamentLifecycle.ts`
- Orchestrates lifecycle transitions: advance round / end / cancel (turn-back) / update, resetting session stores on transition.

#### `useTournamentModals` — `app/composables/tournament/useTournamentModals.ts`
- Pure state container: all modal visibility flags + selection refs for the tournament page.

#### `useTournamentMutations` — `app/composables/tournament/useTournamentMutations.ts`
- Colada mutations for tournament CRUD via BFF, invalidating events/standings caches. Lifecycle transitions stay in the Pinia store.

#### `useTournamentPage` — `app/composables/tournament/useTournamentPage.ts`
- Top-level tournament-page composable: wires Colada queries, tournament store, URL sync; exposes derived state and actions.

#### `useTournamentPlayers` — `app/composables/tournament/useTournamentPlayers.ts`
- Player management actions scoped to a tournament: create/edit, auto-add-to-waitlist, batch remove.

#### `useTournamentQueries` — `app/composables/tournament/useTournamentQueries.ts`
- Large collection of Colada queries for the tournament domain (events, registrations, standings, pairings, kills, history, league counts, etc.), each exporting its own key constant.

#### `useTournamentSubmitHandlers` — `app/composables/tournament/useTournamentSubmitHandlers.ts`
- Modal submit handlers (score/draw/kills/commander/votes), each writing to session store, persisting, toasting, refetching displayed pairings.

#### `useTournamentUrl` — `app/composables/tournament/useTournamentUrl.ts`
- Bidirectional URL query-param ↔ tournament page state sync primitives (readers/writers), all via `router.replace`.

#### `useTournamentUrlSync` — `app/composables/tournament/useTournamentUrlSync.ts`
- Wires the watchers linking `useTournamentUrl`'s readers/writers to actual modal refs.

#### `useWaitingListFlags` — `app/composables/tournament/useWaitingListFlags.ts`
- Per-tournament ephemeral payment-method state for the waiting list, persisted to localStorage; hydrated in `onMounted` to avoid SSR mismatch.

#### `useWaitroom` — `app/composables/tournament/useWaitroom.ts`
- Query + mutations for a tournament's waiting list: reads client→Supabase, register/unregister via BFF.

#### `useWinnerChecklist` — `app/composables/tournament/useWinnerChecklist.ts`
- `useWinners` derives per-table rank-1 winners live from the rankings store; `useWinnerChecklist` persists booster-handover checked-state per player to localStorage.

### root (app/composables/)

#### `useDeveloperView` — `app/composables/useDeveloperView.ts`
- Global localStorage-persisted toggles: `isDeveloperView`, `isOverlayEnabled` (independently persisted).

#### `useDeveloperViewOverlay` — `app/composables/useDeveloperViewOverlay.ts`
- Applies the developer-view debug overlay to the DOM: toggles a class on `<html>`, scans interactive elements for missing accessible names, flags them. Uses a `MutationObserver`; must be called once from `app.vue` only.
