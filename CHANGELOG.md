# Changelog


## v0.1.8

[compare changes](https://github.com/Pauperwave/app/compare/v0.1.7...v0.1.8)

### Enhancements

- **tesseramento:** ✨ add renewal flow for existing associates ([7c94f34](https://github.com/Pauperwave/app/commit/7c94f34))
- **tesseramento:** ✨ make the verify-step email a mailto: link ([8c8b317](https://github.com/Pauperwave/app/commit/8c8b317))
- **associates:** ✨ add membership event history + timeline ([75ada9f](https://github.com/Pauperwave/app/commit/75ada9f))
- **associates:** ✨ rework renewal requests into their own tab ([9dcde87](https://github.com/Pauperwave/app/commit/9dcde87))
- **associates:** ✨ auto-assign PW-#### numbers, editable via dedicated modal ([d84874f](https://github.com/Pauperwave/app/commit/d84874f))
- **players:** ✨ add "Storico Partite" and "Mazzi Commander" cards ([eadb61e](https://github.com/Pauperwave/app/commit/eadb61e))
- **associates:** ✨ add "Lega" column to the detail page's Transazioni table ([18f8c46](https://github.com/Pauperwave/app/commit/18f8c46))
- **competitions:** ✨ add "Copia torneo"/"Copia evento" to the context menu ([3697d8c](https://github.com/Pauperwave/app/commit/3697d8c))
- **competitions:** ✨ add "Copia lega" to the leagues context menu ([6b44079](https://github.com/Pauperwave/app/commit/6b44079))
- **leagues:** ✨ add "Nuovo torneo" button on the league detail page ([59c2372](https://github.com/Pauperwave/app/commit/59c2372))
- **leagues:** ✨ bring the /tournaments context menu to the league detail page ([ee7c611](https://github.com/Pauperwave/app/commit/ee7c611))
- **ui:** 🎨 color the role badge on /players ([1a718b6](https://github.com/Pauperwave/app/commit/1a718b6))
- **transactions:** ✨ wire highlighted-dates on the DateRangePicker ([58b6653](https://github.com/Pauperwave/app/commit/58b6653))
- **calendar:** ✨ add city filter, Today button, and side-by-side toolbar ([0696632](https://github.com/Pauperwave/app/commit/0696632))
- **settings:** ✨ divide "Ruoli e permessi" table into sections by theme ([2892584](https://github.com/Pauperwave/app/commit/2892584))
- **settings:** ✨ add 6 missing rows to the permissions table ([1ff0357](https://github.com/Pauperwave/app/commit/1ff0357))
- **settings:** ✨ add Pubblico column and drop dividers on section rows ([1b1ac6e](https://github.com/Pauperwave/app/commit/1b1ac6e))
- **wanted-cards:** ✨ add "Compatta" dense grid view mode ([4557102](https://github.com/Pauperwave/app/commit/4557102))
- **calendar:** ✨ show the association's codice fiscale on /calendario ([c1cc05e](https://github.com/Pauperwave/app/commit/c1cc05e))

### Fixes

- **tesseramento:** 🐛 stop overwriting request_date on renewal ([ee5e314](https://github.com/Pauperwave/app/commit/ee5e314))
- **associates:** 🐛 paginate geocodes query past PostgREST's 250-row cap ([c1c41c2](https://github.com/Pauperwave/app/commit/c1c41c2))
- **associates:** 🐛 use AssociateTypeBadge in the Tesseramento card ([03b9c47](https://github.com/Pauperwave/app/commit/03b9c47))
- **associates:** 🐛 reorder Tesseramento card dates chronologically ([a2f924f](https://github.com/Pauperwave/app/commit/a2f924f))
- **ui:** 🐛 remove outline-2 width from CalendarHeatmap cell focus ring ([c121c02](https://github.com/Pauperwave/app/commit/c121c02))
- **query:** 🐛 sync fetchAllRows pageSize with the raised db.max_rows ([b478412](https://github.com/Pauperwave/app/commit/b478412))
- **ui:** 🐛 give tessera number badges consistent width ([59144e8](https://github.com/Pauperwave/app/commit/59144e8))
- **calendar:** 🐛 fix "black bands" around the detail slideover hero image ([2792d8b](https://github.com/Pauperwave/app/commit/2792d8b))
- **auth:** 🐛 close route-guard gap on associates/finance/players/locations/rulesets ([aefd696](https://github.com/Pauperwave/app/commit/aefd696))
- **settings:** 🐛 use Tailwind's important modifier to actually cancel divide-x on section rows ([4f56f97](https://github.com/Pauperwave/app/commit/4f56f97))
- **settings:** 🐛 mark viewFinance/viewAssociates/viewPlayers/manageLocations/manageRulesets as implemented ([3011bc6](https://github.com/Pauperwave/app/commit/3011bc6))
- **layouts:** 🐛 remove dead back-to-"/" button from auth.vue and public.vue ([ef5ea4a](https://github.com/Pauperwave/app/commit/ef5ea4a))
- **image:** 🐛 set a custom User-Agent for ipx's remote image fetch ([41583f5](https://github.com/Pauperwave/app/commit/41583f5))
- **calendar:** 🐛 collapse today/month/city controls to fit one row on mobile ([6c2a3cd](https://github.com/Pauperwave/app/commit/6c2a3cd))
- **calendar:** 🐛 disable city filter options with 0 events in the selected month ([042a487](https://github.com/Pauperwave/app/commit/042a487))
- **theme:** 🐛 size the theme-toggle reveal circle against the physical screen bounds ([8c32b9a](https://github.com/Pauperwave/app/commit/8c32b9a))

### Refactors

- **icons:** 🎨 centralize icon literals into ICONS across the app ([341f821](https://github.com/Pauperwave/app/commit/341f821))
- **tournaments:** 🔥 dedup the copy-modal state and context menu builder ([c0cd5d5](https://github.com/Pauperwave/app/commit/c0cd5d5))
- **finance:** 🔥 dedup amount formatter and summary table boilerplate ([d6dfe3a](https://github.com/Pauperwave/app/commit/d6dfe3a))
- **transactions:** 🔥 dedup event_name/gettoni cell rendering ([7605a05](https://github.com/Pauperwave/app/commit/7605a05))
- **ui:** 🔥 dedup calendar day-highlight logic, drop DateRangePicker's calendarYears ([2e773e5](https://github.com/Pauperwave/app/commit/2e773e5))
- **composables:** 🔥 dedup row-context-menu state and copy-to-clipboard ([a958e62](https://github.com/Pauperwave/app/commit/a958e62))
- **tournaments:** 🔥 dedup pod-splitting slice logic ([4ef77b0](https://github.com/Pauperwave/app/commit/4ef77b0))
- **associates:** 🔥 dedup statute/data-consent checkboxes ([4dbdd61](https://github.com/Pauperwave/app/commit/4dbdd61))
- **associates:** 🔥 dedup selected-rows-via-filtered-model computed ([fce3051](https://github.com/Pauperwave/app/commit/fce3051))
- **pages:** 🔥 dedup hand-rolled table-ref types via VisibilityTableRef ([d4c882e](https://github.com/Pauperwave/app/commit/d4c882e))
- **ui:** 🔥 dedup pointer-following virtual tooltip reference ([0c61b39](https://github.com/Pauperwave/app/commit/0c61b39))
- **nav:** 🎨 restructure the sidebar's overview/Commander stats sections ([e9425a9](https://github.com/Pauperwave/app/commit/e9425a9))
- **composables:** ♻️ dedupe useCopyLinkContextMenu's copy logic into useCopyToClipboard ([d965f2a](https://github.com/Pauperwave/app/commit/d965f2a))
- **finance:** ♻️ extract computeGrandTotal/resolveTournament helpers in useFinanceSummary ([a9a4e81](https://github.com/Pauperwave/app/commit/a9a4e81))
- **tournaments:** ♻️ extract resolveRegistrationUuids helper in AcceptancePicker ([ade1afb](https://github.com/Pauperwave/app/commit/ade1afb))
- **associates:** ♻️ extract useAssociatesTableSetup for shared route/table/rowActions wiring ([9d1ea74](https://github.com/Pauperwave/app/commit/9d1ea74))
- **associates:** ♻️ reuse useHomeActionCounts in requests.vue instead of recomputing counts ([09b1327](https://github.com/Pauperwave/app/commit/09b1327))
- **finance:** ♻️ extract columnTotal helper for summary table footer sums ([d5e2ebe](https://github.com/Pauperwave/app/commit/d5e2ebe))
- **home:** ♻️ extract upcomingTournaments util shared by Player.vue/Staff.vue ([5f7a3c3](https://github.com/Pauperwave/app/commit/5f7a3c3))
- **finance:** ♻️ extract yearSelectItems/availableTransactionYears helpers ([0cbbc7f](https://github.com/Pauperwave/app/commit/0cbbc7f))
- **transactions:** ♻️ extract transactionNotesCell into transactionCells.ts ([8299be8](https://github.com/Pauperwave/app/commit/8299be8))
- **tables:** ♻️ extract auditAssociateCell for createdBy/updatedBy columns ([47fe38b](https://github.com/Pauperwave/app/commit/47fe38b))
- **settings:** ♻️ extract updatePauperwaveSettings server helper ([628195d](https://github.com/Pauperwave/app/commit/628195d))
- **associates:** ♻️ extract requireUserEmail server helper ([0121f49](https://github.com/Pauperwave/app/commit/0121f49))
- **leagues:** ♻️ extract LeagueTournamentsProgress shared by Card.vue/PresentationCard.vue ([579684f](https://github.com/Pauperwave/app/commit/579684f))
- **finance:** ♻️ reuse columnTotal in chart components, mark remaining chart scaffolding ([3ccb913](https://github.com/Pauperwave/app/commit/3ccb913))
- **dupes:** ♻️ extract filterStandingsBySearch, fix fallow-ignore marker syntax ([b8cebf1](https://github.com/Pauperwave/app/commit/b8cebf1))
- **layout:** ♻️ collapse nav badge v-if chain into a data-driven v-for ([104c218](https://github.com/Pauperwave/app/commit/104c218))
- **home:** ♻️ split Staff.vue's six card sections into their own components ([af78c7d](https://github.com/Pauperwave/app/commit/af78c7d))
- **finance:** ♻️ extract addPaymentMethodTotal helper in useFinanceSummary ([0fda6aa](https://github.com/Pauperwave/app/commit/0fda6aa))
- **leagues:** ♻️ split useLeaguesQuery's tournament aggregation into three named passes ([44c9f78](https://github.com/Pauperwave/app/commit/44c9f78))
- **players:** ♻️ split player detail page's three history cards into their own components ([a520b0e](https://github.com/Pauperwave/app/commit/a520b0e))
- **wanted-cards:** ✨ refine dense grid view, extract shared row-action pieces ([8e008b3](https://github.com/Pauperwave/app/commit/8e008b3))
- **images:** ✨ switch remaining Scryfall <img> tags to NuxtImg ([e277828](https://github.com/Pauperwave/app/commit/e277828))

### Documentation

- 📝 document the Nuxt UI :ui override / tailwind-merge signature gotcha ([33797af](https://github.com/Pauperwave/app/commit/33797af))
- 📝 document the ICONS convention and shared row-actions composables ([0171f14](https://github.com/Pauperwave/app/commit/0171f14))
- 📝 document fallow tooling gotchas learned this session ([99e7af1](https://github.com/Pauperwave/app/commit/99e7af1))

### Chore

- **supabase:** 🔧 regenerate database types ([abf52b6](https://github.com/Pauperwave/app/commit/abf52b6))
- **associates:** 🔥 resolve stray TODOs on the associate detail/roster pages ([4ec980a](https://github.com/Pauperwave/app/commit/4ec980a))
- **associates:** 🔥 remove associateStatus.ts, superseded by membershipStatusBadge.ts ([6fafae2](https://github.com/Pauperwave/app/commit/6fafae2))
- **dupes:** 🔧 mark intentional parameterized duplication with fallow-ignore ([0d41b69](https://github.com/Pauperwave/app/commit/0d41b69))
- **dupes:** 🔧 mark remaining intentional parameterized duplication with fallow-ignore ([a7e34e2](https://github.com/Pauperwave/app/commit/a7e34e2))
- **dupes:** 🔧 mark Cover.vue trio and detail-page header shells as intentional duplication ([2cfe0c8](https://github.com/Pauperwave/app/commit/2cfe0c8))
- **dupes:** 🔧 mark public/internal mirror pages and remaining chart pairs as intentional ([3db1326](https://github.com/Pauperwave/app/commit/3db1326))
- **dupes:** 🔧 fix remaining multi-line fallow-ignore markers, add fallow:dupes:markers check ([98983e4](https://github.com/Pauperwave/app/commit/98983e4))
- **fallow:** 🔧 ignore @iconify-json/circle-flags and /lucide as unused dependencies ([91a4984](https://github.com/Pauperwave/app/commit/91a4984))
- **fallow:** 🔧 add health.thresholdOverrides for reviewed template-complexity findings ([4b03f5c](https://github.com/Pauperwave/app/commit/4b03f5c))

### Styles

- 🎨 reformat multi-line statements and trim stale comments ([423f389](https://github.com/Pauperwave/app/commit/423f389))
- **competitions:** 🎨 add separators to tournament/event context menus ([b5e602e](https://github.com/Pauperwave/app/commit/b5e602e))
- **calendar:** 🎨 remove elevated pill styling from the Pauperwave header logo ([12fbfd8](https://github.com/Pauperwave/app/commit/12fbfd8))
- **calendar:** 🎨 tighten gap between Oggi and month picker on public calendar ([aff81c3](https://github.com/Pauperwave/app/commit/aff81c3))

### ❤️ Contributors

- Emanuele Nardi ([@emanuelenardi](https://github.com/emanuelenardi))

## v0.1.7

[compare changes](https://github.com/Pauperwave/app/compare/v0.1.6...v0.1.7)

### Enhancements

- **transactions:** ✨ add Tesseramento column (new/renewal/missing-associate) ([b5386b5](https://github.com/Pauperwave/app/commit/b5386b5))
- **transactions:** ✨ hide Evento column on Quote associative/Donazioni tabs ([e34af0f](https://github.com/Pauperwave/app/commit/e34af0f))
- **transactions:** ✨ collapse toolbar controls to icon-only ([dc415dc](https://github.com/Pauperwave/app/commit/dc415dc))
- **transactions:** ✨ add "Da sistemare" tab flagging real data gaps ([cff35b2](https://github.com/Pauperwave/app/commit/cff35b2))
- ✨ add section dividers to every "Mostra colonne" menu ([2bd1ef3](https://github.com/Pauperwave/app/commit/2bd1ef3))
- **tournaments:** ✨ make "Giocatore" sortable on "Iscritti (Pagato)" ([1f0e921](https://github.com/Pauperwave/app/commit/1f0e921))
- **tournaments:** ✨ add bulk-remove to "Pre-registrati" ([c3ba98e](https://github.com/Pauperwave/app/commit/c3ba98e))

### Fixes

- **transactions:** 🐛 resolve real event link ahead of raw event_name text ([d617768](https://github.com/Pauperwave/app/commit/d617768))
- **tournaments:** 🐛 stop hard-deleting registration on "Rimuovi" ([2cde4c5](https://github.com/Pauperwave/app/commit/2cde4c5))
- **tournaments:** 🐛 resolve ambiguous column in register_tournament_players ([f8dc113](https://github.com/Pauperwave/app/commit/f8dc113))

### Refactors

- **tournaments:** ♻️ extract Escape-to-clear into useEscapeToClear ([73988ba](https://github.com/Pauperwave/app/commit/73988ba))
- **tournaments:** ♻️ extract row-selection and remove-confirm composables ([b2ba011](https://github.com/Pauperwave/app/commit/b2ba011))

### Styles

- **tournaments:** 🎨 reformat AcceptancePicker.vue, tune payment button size ([1dcbbb4](https://github.com/Pauperwave/app/commit/1dcbbb4))

### ❤️ Contributors

- Emanuele Nardi ([@emanuelenardi](https://github.com/emanuelenardi))

## v0.1.6

[compare changes](https://github.com/Pauperwave/app/compare/v0.1.5...v0.1.6)

### Enhancements

- **statistics:** ✨ add year selector and manual refresh to the dashboard ([e4ba38d](https://github.com/Pauperwave/app/commit/e4ba38d))
- **associates:** ✨ show Età column in /associates/requests ([93d621c](https://github.com/Pauperwave/app/commit/93d621c))

### Fixes

- **query:** 🐛 page past PostgREST's silent 250-row cap ([4828b16](https://github.com/Pauperwave/app/commit/4828b16))
- **statistics:** 🐛 always render chart legend on its own row ([7429436](https://github.com/Pauperwave/app/commit/7429436))

### ❤️ Contributors

- Emanuele Nardi ([@emanuelenardi](https://github.com/emanuelenardi))

## v0.1.5

[compare changes](https://github.com/Pauperwave/app/compare/v0.1.4...v0.1.5)

### Enhancements

- **ui:** ✨ add icons to status/type filter tabs, collapse to icon-only below lg ([296b777](https://github.com/Pauperwave/app/commit/296b777))
- **finance:** ✨ add Contanti/Pos/Paypal breakdowns, gettoni revenue rollup, and scalable Riepilogo per categoria ([9479b5d](https://github.com/Pauperwave/app/commit/9479b5d))
- **transactions:** ✨ add search bar, collapse group-by-payer to icon-only, rename Gettoni tab ([13b7684](https://github.com/Pauperwave/app/commit/13b7684))
- **tournaments:** ✨ add useDraftPods for Draft format pod-size distribution ([cb41fc8](https://github.com/Pauperwave/app/commit/cb41fc8))
- **tournaments:** ✨ add useCommanderPods, ported from MagicTheGathering/league ([60f8c4b](https://github.com/Pauperwave/app/commit/60f8c4b))
- **tournaments:** ✨ add useSwissRoundCount composable ([b5695da](https://github.com/Pauperwave/app/commit/b5695da))
- **tournaments:** ✨ add PresentationCard and pod formation to tournament detail page ([2526123](https://github.com/Pauperwave/app/commit/2526123))
- **tournaments:** ✨ drop 'dropped' registration status ([322ca18](https://github.com/Pauperwave/app/commit/322ca18))
- **tournaments:** ✨ add register_tournament_players RPC ([fe9e658](https://github.com/Pauperwave/app/commit/fe9e658))
- **tournaments:** ✨ add tournament-registrations BFF endpoints ([45073f1](https://github.com/Pauperwave/app/commit/45073f1))
- **tournaments:** ✨ add registrations/payments query composables ([f7483f8](https://github.com/Pauperwave/app/commit/f7483f8))
- **tournaments:** ✨ add registrations mutations composable ([122cabd](https://github.com/Pauperwave/app/commit/122cabd))
- **tournaments:** ✨ wire AcceptancePicker UI to real persistence ([d03016c](https://github.com/Pauperwave/app/commit/d03016c))
- **players:** ✨ drop nickname column app-wide ([809f2b8](https://github.com/Pauperwave/app/commit/809f2b8))
- **players:** ✨ show id column and Tessera badge, default sort by id ([619a72e](https://github.com/Pauperwave/app/commit/619a72e))
- **roles:** ✨ add shared ROLE_ICON map, roll out to view-as menu and permissions matrix ([e87370f](https://github.com/Pauperwave/app/commit/e87370f))
- **settings:** ✨ wire /settings/members to the real role system ([b1c5dc8](https://github.com/Pauperwave/app/commit/b1c5dc8))
- **players:** ✨ add delete and promote-to-role actions to context menu ([ef5c021](https://github.com/Pauperwave/app/commit/ef5c021))
- **roles:** ✨ use shield-plus icon for the "Promuovi a" menu item ([e39c55e](https://github.com/Pauperwave/app/commit/e39c55e))
- **settings:** ✨ repurpose "Invita persone" into an assign-role modal ([6c1af75](https://github.com/Pauperwave/app/commit/6c1af75))
- **players:** ✨ show a Ruolo column ([632a763](https://github.com/Pauperwave/app/commit/632a763))
- **transactions:** ✨ add receipt_ref column, stop parsing it out of notes ([90f4b15](https://github.com/Pauperwave/app/commit/90f4b15))

### Fixes

- **finance:** 🐛 fix missing hover tooltips on the byType/byFormat/tournament charts ([1fcd294](https://github.com/Pauperwave/app/commit/1fcd294))
- **finance:** 🐛 use text-dimmed, not text-muted, for zero-amount table cells ([f8dc049](https://github.com/Pauperwave/app/commit/f8dc049))
- **associates:** 🐛 make MEMBERSHIP_STATUS_BADGE_CONFIG exhaustive over MembershipStatus ([e432430](https://github.com/Pauperwave/app/commit/e432430))
- **tournaments:** 🐛 make description textarea taller ([f5f13e9](https://github.com/Pauperwave/app/commit/f5f13e9))
- **selection:** 🐛 keep shift-click anchor fixed across repeated shift-clicks ([3e1cdfc](https://github.com/Pauperwave/app/commit/3e1cdfc))
- **forms:** 🐛 trim whitespace on free-text form fields ([505b646](https://github.com/Pauperwave/app/commit/505b646))
- **tournaments:** 🐛 add status colors to bulk "Segna come" menu ([b15a728](https://github.com/Pauperwave/app/commit/b15a728))
- **transactions:** 🐛 resolve tournament/event links instead of raw historical text ([040f7c1](https://github.com/Pauperwave/app/commit/040f7c1))
- **transactions:** 🐛 wire Add/Edit transaction forms to real tournament/event FKs ([1984421](https://github.com/Pauperwave/app/commit/1984421))
- **charts:** 🐛 eliminate flash-of-empty-chart on load with skeleton placeholders ([f4b20a6](https://github.com/Pauperwave/app/commit/f4b20a6))
- **finance:** 🐛 show ListSkeleton on first load for summary tables ([68f5ffc](https://github.com/Pauperwave/app/commit/68f5ffc))
- **community:** 🐛 show ListSkeleton on first load for transactions/associates tables ([3caf22f](https://github.com/Pauperwave/app/commit/3caf22f))
- **players:** 🐛 close remaining ListSkeleton gaps found in loading-state audit ([24f1525](https://github.com/Pauperwave/app/commit/24f1525))
- **wanted-cards:** 🐛 replace generic spinner with view-mode-aware skeleton ([73228e7](https://github.com/Pauperwave/app/commit/73228e7))

### Refactors

- **nav:** 🎨 reorder sidebar community section and associates sub-nav tabs ([c9e99b0](https://github.com/Pauperwave/app/commit/c9e99b0))
- **ui:** ♻️ extract ColumnVisibilityMenu, collapse to icon-only below lg ([295973f](https://github.com/Pauperwave/app/commit/295973f))

### Documentation

- **finance:** 📝 audit payment_amount corrections found while building category table ([0ea30a6](https://github.com/Pauperwave/app/commit/0ea30a6))
- **finance:** 📝 revert Sealed discount correction, confirmed as valid ([789a846](https://github.com/Pauperwave/app/commit/789a846))
- **architecture:** 📝 document all current Postgres functions ([7b9c8cc](https://github.com/Pauperwave/app/commit/7b9c8cc))

### Chore

- **git:** 🙈 ignore local .mcp.json ([b0d4a4d](https://github.com/Pauperwave/app/commit/b0d4a4d))
- **supabase:** 🔧 regenerate database types for register_tournament_players ([1f6735f](https://github.com/Pauperwave/app/commit/1f6735f))

### Styles

- **finance:** 🎨 color the Costi commissioni/Netto card icons red/green ([70dc1fc](https://github.com/Pauperwave/app/commit/70dc1fc))
- **finance:** 🎨 mute 0,00 € everywhere, add cumulative column to Riepilogo mensile ([ad127b8](https://github.com/Pauperwave/app/commit/ad127b8))

### ❤️ Contributors

- Emanuele Nardi ([@emanuelenardi](https://github.com/emanuelenardi))

## v0.1.4

[compare changes](https://github.com/Pauperwave/app/compare/v0.1.3...v0.1.4)

### Enhancements

- **tournaments:** ✨ replace the loading spinner with a content skeleton ([bdb7c42](https://github.com/Pauperwave/app/commit/bdb7c42))
- **tournaments:** ✨ size the skeleton to the real known card count ([f31d77f](https://github.com/Pauperwave/app/commit/f31d77f))
- **tournaments:** ✨ show per-card skeletons on detail-page grids ([d377c12](https://github.com/Pauperwave/app/commit/d377c12))
- **leagues:** ✨ per-card grid skeleton + inline ruleset picker ([0b95a6b](https://github.com/Pauperwave/app/commit/0b95a6b))
- **locations:** ✨ per-card grid skeleton for the locations grid ([e66b73e](https://github.com/Pauperwave/app/commit/e66b73e))
- **leagues:** ✨ show contained tournaments' formats and date range (ADR-024) ([d4dd25f](https://github.com/Pauperwave/app/commit/d4dd25f))
- **tournaments:** ✨ add league/event picker to the Add/Edit forms ([c75b923](https://github.com/Pauperwave/app/commit/c75b923))
- **tournaments:** ✨ more ways to link tournaments to a league ([125ae42](https://github.com/Pauperwave/app/commit/125ae42))
- **leagues:** ✨ show the full date range on the grid card ([c3215b2](https://github.com/Pauperwave/app/commit/c3215b2))
- **tournaments:** ✨ always show each tournament's stage number within its league ([#52](https://github.com/Pauperwave/app/pull/52))
- **events:** ✨ add update/status/delete endpoints, imageUrl support ([3471e0b](https://github.com/Pauperwave/app/commit/3471e0b))
- **events:** ✨ expose organizerUuid/locationUuid/locationMapsUrl on Event ([0cdecbc](https://github.com/Pauperwave/app/commit/0cdecbc))
- **events:** ✨ add update/status/delete mutations, bulk/row actions composables ([1c787c1](https://github.com/Pauperwave/app/commit/1c787c1))
- **events:** ✨ split inline card into Card.vue/Cover.vue with loading skeleton ([#45](https://github.com/Pauperwave/app/pull/45))
- **events:** ✨ add EditModal/BulkActionsBar, image picker, explicit start/end time ([746bd00](https://github.com/Pauperwave/app/commit/746bd00))
- **events:** ✨ wire selection/bulk-actions/edit-modal into events/index.vue ([77cb822](https://github.com/Pauperwave/app/commit/77cb822))
- **tournaments:** ✨ let AddModal.vue be pre-seeded and driven externally ([3f9151b](https://github.com/Pauperwave/app/commit/3f9151b))
- **events:** ✨ Google Calendar-style day schedule with click-to-create ([223ec5b](https://github.com/Pauperwave/app/commit/223ec5b))
- **trash:** ✨ add admin-only Trash page with cross-domain soft-delete restore ([86f1c73](https://github.com/Pauperwave/app/commit/86f1c73))
- **locations:** ✨ add soft delete support ([0f37fa8](https://github.com/Pauperwave/app/commit/0f37fa8))
- **trash:** ✨ add deleted_by audit trail to soft-deletable tables ([b717079](https://github.com/Pauperwave/app/commit/b717079))
- **list-pages:** ✨ default DateRangePicker to next-year instead of all-time ([2701ca9](https://github.com/Pauperwave/app/commit/2701ca9))
- **tournaments:** ✨ dot existing tournament dates in the scheduling picker ([e450dc2](https://github.com/Pauperwave/app/commit/e450dc2))
- **nav:** ✨ turn Classifiche into a dropdown, move Regolamenti out ([#65](https://github.com/Pauperwave/app/pull/65))
- **nav:** ✨ hide sidebar badges while the "g" shortcut hint is showing ([#66](https://github.com/Pauperwave/app/pull/66))
- **rulesets:** ✨ add Draft and Sealed tabs to Regolamenti ([5952e80](https://github.com/Pauperwave/app/commit/5952e80))
- **trash:** ✨ 60-day retention countdown, permanent purge, AssociateTag ([757f380](https://github.com/Pauperwave/app/commit/757f380))
- **settings:** ✨ split profile into its own tab ([a821c5c](https://github.com/Pauperwave/app/commit/a821c5c))
- **permissions:** ⬆️ admin gains every power except permanent deletion ([2ef7081](https://github.com/Pauperwave/app/commit/2ef7081))
- **roles:** 🔒️ admin can assign roles but never touch super_admin ([fc7ca8e](https://github.com/Pauperwave/app/commit/fc7ca8e))
- **events:** ✨ default new-event time/organizer/location ([7d018b1](https://github.com/Pauperwave/app/commit/7d018b1))
- **payments:** ✨ add "Comped" method and "Token Purchase" (gettoni) type ([c9467c9](https://github.com/Pauperwave/app/commit/c9467c9))
- **transactions:** ✨ bulk change payment type, calendar-year range presets ([5140bee](https://github.com/Pauperwave/app/commit/5140bee))
- **nav:** ✨ add sidebar count badges for transactions/tournaments/leagues/events/locations ([2da0d69](https://github.com/Pauperwave/app/commit/2da0d69))
- **finance:** ✨ add /finance dashboard ([28d1a0f](https://github.com/Pauperwave/app/commit/28d1a0f))

### Fixes

- **ui:** 🐛 CalendarHeatmap spanDates could drop the last day ([102d799](https://github.com/Pauperwave/app/commit/102d799))
- **ui:** 🐛 make ListSkeleton's grid card mirror the real card's shape ([77e5869](https://github.com/Pauperwave/app/commit/77e5869))
- **ui:** 🐛 ListSkeleton: clip the bleeding cover, force full-pill badges ([138ec42](https://github.com/Pauperwave/app/commit/138ec42))
- **ui:** 🐛 ListSkeleton badges should be rounded-md, not pill-shaped ([da1760f](https://github.com/Pauperwave/app/commit/da1760f))
- **ui:** 🐛 ListSkeleton cover: mirror Cover.vue's two-element bleed shape ([f0e12ac](https://github.com/Pauperwave/app/commit/f0e12ac))
- **ui:** 🐛 ListSkeleton: fix three more height mismatches vs the real card ([8712905](https://github.com/Pauperwave/app/commit/8712905))
- **ui:** 🐛 ListSkeleton: restore a small gap between title/subtitle lines ([353e753](https://github.com/Pauperwave/app/commit/353e753))
- **locations:** 🐛 reserve social-links space + skeleton the detail header ([8febb99](https://github.com/Pauperwave/app/commit/8febb99))
- **tables:** 🐛 use UTable's own loading bar on refresh, not a full skeleton swap ([1ff53ee](https://github.com/Pauperwave/app/commit/1ff53ee))
- **grids:** 🐛 extend the isPending-vs-isLoading refresh fix to grid views ([3303a0d](https://github.com/Pauperwave/app/commit/3303a0d))
- **tables:** 🐛 shift-click checkbox range ignored the active sort ([2396339](https://github.com/Pauperwave/app/commit/2396339))
- **tournaments:** 🐛 exclude cancelled tournaments from stage numbering, show year in league date range ([fc71772](https://github.com/Pauperwave/app/commit/fc71772))
- **locations:** 🐛 add missing right-click context menu ([6d529f3](https://github.com/Pauperwave/app/commit/6d529f3))
- **calendar:** 🐛 fix HomeDateRangePicker event-dot tooltip and hover label ([f4b1d4c](https://github.com/Pauperwave/app/commit/f4b1d4c))
- **i18n:** 🐛 set Nuxt UI's own locale to Italian ([4b91a3e](https://github.com/Pauperwave/app/commit/4b91a3e))
- **settings:** 🐛 fix mismatched Importo/Metodo di pagamento picker widths ([ae74780](https://github.com/Pauperwave/app/commit/ae74780))
- **nav:** 🐛 use ICONS.commander (shield-half) for Comandanti, not crown ([#44](https://github.com/Pauperwave/app/pull/44))
- **icons:** 🐛 use ICONS.gameplay for format pickers, not layers ([#43](https://github.com/Pauperwave/app/pull/43))
- **nav:** 🐛 drop g-h shortcut, move g-r to Richieste di tesseramento ([2605ad2](https://github.com/Pauperwave/app/commit/2605ad2))
- **home:** 🐛 reorder guided tour steps to match new card layout ([7f7729e](https://github.com/Pauperwave/app/commit/7f7729e))
- **icons:** 🐛 add gameplay icon to FormatBadge in calendar and tournaments table ([ad473bb](https://github.com/Pauperwave/app/commit/ad473bb))

### Refactors

- **ui:** ♻️ ListSkeleton: rely on UCard's own overflow-hidden and USkeleton defaults ([beb4b8e](https://github.com/Pauperwave/app/commit/beb4b8e))
- **tournaments:** ♻️ merge grid skeleton into card components ([5ce61fb](https://github.com/Pauperwave/app/commit/5ce61fb))
- **nav:** ♻️ remove dead devStatus metadata field ([4be6fd2](https://github.com/Pauperwave/app/commit/4be6fd2))
- **home:** ♻️ drop redundant Home prefix from component filenames ([94f3385](https://github.com/Pauperwave/app/commit/94f3385))
- **components:** ♻️ move DateRangePicker to ui/ ([#23](https://github.com/Pauperwave/app/pull/23))
- **leagues:** ♻️ swap Nome and Regolamento field positions ([922f631](https://github.com/Pauperwave/app/commit/922f631))
- **home:** ♻️ regroup staff cards, equal heights, top-aligned content ([c5b6684](https://github.com/Pauperwave/app/commit/c5b6684))

### Documentation

- **ui:** 📝 note ListSkeleton's card shape is deliberately tournament-specific ([6e779c6](https://github.com/Pauperwave/app/commit/6e779c6))

### Chore

- **db:** ♻️ regenerate Supabase types ([c66760c](https://github.com/Pauperwave/app/commit/c66760c))

### Styles

- **tournaments:** 💄 size skeleton bars to match real content lengths ([754ea21](https://github.com/Pauperwave/app/commit/754ea21))
- **modals:** 💄 tighten and unify Add/Edit modal vertical spacing ([7530d92](https://github.com/Pauperwave/app/commit/7530d92))
- **leagues:** 💄 spell out full month names in the card's date range line ([bc1e82f](https://github.com/Pauperwave/app/commit/bc1e82f))

### ❤️ Contributors

- Emanuele Nardi ([@emanuelenardi](https://github.com/emanuelenardi))

## v0.1.3

[compare changes](https://github.com/Pauperwave/app/compare/v0.1.2...v0.1.3)

### Enhancements

- **db:** 🔥 import 81 associates missing from the DB since 2026-08-12 ([9dd8f92](https://github.com/Pauperwave/app/commit/9dd8f92))
- **associates:** 📱 format phone numbers in the roster table ([18d273e](https://github.com/Pauperwave/app/commit/18d273e))
- **app:** 🏷️ dynamic browser tab titles per page ([802c4f6](https://github.com/Pauperwave/app/commit/802c4f6))
- **statistics:** ✨ overhaul the statistics dashboard with real charts ([5ef8dd7](https://github.com/Pauperwave/app/commit/5ef8dd7))
- **associates:** ✨ add an age column to the roster ([e1d6046](https://github.com/Pauperwave/app/commit/e1d6046))
- **associates:** ✨ click a roster row to open the associate's detail page ([e1028e2](https://github.com/Pauperwave/app/commit/e1028e2))
- **associates:** ✨ add copy phone/email to row context menu and actions ([5f37e2d](https://github.com/Pauperwave/app/commit/5f37e2d))
- **settings:** ✨ make the membership fee amount/payment method admin-editable ([aff3177](https://github.com/Pauperwave/app/commit/aff3177))
- **associates:** 🔥 remove MTGO/MTGA nickname fields (app + database) ([829e873](https://github.com/Pauperwave/app/commit/829e873))
- **home:** ✨ role-differentiated Home (HomeStaff/HomePlayer) ([5015e94](https://github.com/Pauperwave/app/commit/5015e94))
- **home:** ✨ sync quick-create menu and Cmd+K palette from one source ([00c955e](https://github.com/Pauperwave/app/commit/00c955e))
- **locations:** ✨ add location detail page ([94eba81](https://github.com/Pauperwave/app/commit/94eba81))
- **home:** ✨ expand HomeStaff dashboard ([d0a1fdd](https://github.com/Pauperwave/app/commit/d0a1fdd))
- **ui:** ✨ add HighlightMatch and SearchInput components ([f74a424](https://github.com/Pauperwave/app/commit/f74a424))
- **associates:** ✨ rich multi-field search with match highlighting ([6dc286c](https://github.com/Pauperwave/app/commit/6dc286c))
- **players:** ✨ add search with match highlighting ([ecfc811](https://github.com/Pauperwave/app/commit/ecfc811))
- **standings:** ✨ add search with match highlighting ([5dabbdf](https://github.com/Pauperwave/app/commit/5dabbdf))
- **tournaments:** ✨ add calendar heatmap and hover-highlight sync with grid cards ([46ee9e3](https://github.com/Pauperwave/app/commit/46ee9e3))
- **leagues:** ✨ add presentation card, tournament heatmap, and mock leaderboard to detail page ([a390cfc](https://github.com/Pauperwave/app/commit/a390cfc))
- **locations:** ✨ switch to slug-based detail page with presentation card and tournament heatmap ([5fb4450](https://github.com/Pauperwave/app/commit/5fb4450))
- **events:** ✨ add real event detail page with tournament activity heatmap ([8e11a46](https://github.com/Pauperwave/app/commit/8e11a46))
- **players:** ✨ track login history and add player detail page ([fa28146](https://github.com/Pauperwave/app/commit/fa28146))
- **tournaments:** ✨ show card name and artist attribution on cover art ([fd201f6](https://github.com/Pauperwave/app/commit/fd201f6))
- **home:** ✨ one guided-tour step per dashboard section ([bcf9d52](https://github.com/Pauperwave/app/commit/bcf9d52))

### Fixes

- **wanted-cards:** 🐛 preselect the saved printing on the first EditModal open ([2eb4b49](https://github.com/Pauperwave/app/commit/2eb4b49))
- **icons:** 🐛 add ICONS.playerLapsed/cake missing from the statistics commit ([71b9825](https://github.com/Pauperwave/app/commit/71b9825))
- **associates:** 🐛 distinguish 'unpaid' from 'expired' membership status ([91eae4c](https://github.com/Pauperwave/app/commit/91eae4c))
- **cittadino:** 🐛 give each event's format chip its own color ([57dd69a](https://github.com/Pauperwave/app/commit/57dd69a))
- **associates:** 🐛 validate birth province, minor phone, and tax code against form data ([d54960e](https://github.com/Pauperwave/app/commit/d54960e))
- **locations:** 🐛 polish the card's closed-state, footer, and social links ([5d01ec6](https://github.com/Pauperwave/app/commit/5d01ec6))
- **layout:** 🐛 polish collapsed-sidebar affordances ([ee0dd96](https://github.com/Pauperwave/app/commit/ee0dd96))
- **modals:** 🐛 reset Add-modal form state on submit/cancel, not on backdrop or X close ([c3e2d04](https://github.com/Pauperwave/app/commit/c3e2d04))
- **associates:** 🐛 drop overly-permissive catch-all RLS policy ([fa09a09](https://github.com/Pauperwave/app/commit/fa09a09))
- **layout:** 🐛 derive the user menu's name/avatar from the logged-in user ([ad63a55](https://github.com/Pauperwave/app/commit/ad63a55))

### Refactors

- **associates:** ♻️ migrate row selection to useSelection composable ([dc639c4](https://github.com/Pauperwave/app/commit/dc639c4))
- **associates:** ♻️ componentize status/type/payment badges, overhaul associate detail page ([2d39745](https://github.com/Pauperwave/app/commit/2d39745))
- **associates:** ♻️ two-column modal layout, paired fields, and consent document links ([0b093c7](https://github.com/Pauperwave/app/commit/0b093c7))
- **utils:** ♻️ move domain-specific utils into subfolders ([1d707d7](https://github.com/Pauperwave/app/commit/1d707d7))
- **transactions:** ♻️ extract transactionPayerName util ([39be837](https://github.com/Pauperwave/app/commit/39be837))
- **associates:** ♻️ reorder row context menu ([0f99a1d](https://github.com/Pauperwave/app/commit/0f99a1d))

### Documentation

- **audits:** 📝 categorize the 171 associates/CSV field conflicts ([0937113](https://github.com/Pauperwave/app/commit/0937113))
- **progress:** 📝 sketch ADR-021 for event-backed notifications ([126fd00](https://github.com/Pauperwave/app/commit/126fd00))
- **claude:** 📝 fix stale mock-data notes in CLAUDE.md ([8b75bd8](https://github.com/Pauperwave/app/commit/8b75bd8))
- **claude:** 📝 fix stale tournament-routing note in CLAUDE.md ([2cecc1f](https://github.com/Pauperwave/app/commit/2cecc1f))
- 📝 log TODO for skeleton loading state on QueryRefreshControl ([8b39d8a](https://github.com/Pauperwave/app/commit/8b39d8a))
- 📝 move BACKLOG.md items to GitHub Issues + the "App" project ([f206ad5](https://github.com/Pauperwave/app/commit/f206ad5))
- 📝 move TODO.md items to GitHub Issues too ([36fcbb6](https://github.com/Pauperwave/app/commit/36fcbb6))
- 📝 add ADR-023 documenting the GitHub Issues/Project triage conventions ([34d2982](https://github.com/Pauperwave/app/commit/34d2982))

### Chore

- **settings:** 📝 mark app/rankings/calendario/tesseramento subdomains as live ([c7608ea](https://github.com/Pauperwave/app/commit/c7608ea))
- **i18n:** 📝 rename "Super amministratore" role label to "Sviluppatore" ([831f093](https://github.com/Pauperwave/app/commit/831f093))

### Styles

- 🎨 wrap multi-attribute UFormField/object literals onto their own lines ([80e5941](https://github.com/Pauperwave/app/commit/80e5941))
- **tournaments:** 🎨 tighten spacing between form fields in the Add/Edit modals ([ed0cf92](https://github.com/Pauperwave/app/commit/ed0cf92))

### ❤️ Contributors

- Emanuele Nardi ([@emanuelenardi](https://github.com/emanuelenardi))

## v0.1.2

[compare changes](https://github.com/Pauperwave/app/compare/v0.1.1...v0.1.2)

### Fixes

- **release:** 🔖 emoji-tag changelogen's own release commit message ([d38c5f7](https://github.com/Pauperwave/app/commit/d38c5f7))
- **db:** 🐛 wire set_updated_at() to every table that has updated_at ([2568813](https://github.com/Pauperwave/app/commit/2568813))

### Documentation

- **testing:** 📝 sketch a tiered, concrete testing coverage plan ([5b7a2b2](https://github.com/Pauperwave/app/commit/5b7a2b2))
- **supabase:** 📝 make the Functions section the single complete inventory ([1efb576](https://github.com/Pauperwave/app/commit/1efb576))
- **supabase:** 📝 dedupe Realtime Configuration, fix Migration Notes drift ([68449c4](https://github.com/Pauperwave/app/commit/68449c4))
- **supabase:** 📝 complete the extensions inventory, reword indexes example ([d4365c2](https://github.com/Pauperwave/app/commit/d4365c2))

### Chore

- **release:** 🔖 v0.1.1 ([a6a1daa](https://github.com/Pauperwave/app/commit/a6a1daa))
- **db:** 🔥 drop the unused uuid-ossp extension ([8045881](https://github.com/Pauperwave/app/commit/8045881))

### ❤️ Contributors

- Emanuele Nardi ([@emanuelenardi](https://github.com/emanuelenardi))

## v0.1.1

[compare changes](https://github.com/Pauperwave/app/compare/v0.1.0...v0.1.1)

### Enhancements

- **db:** 🔒️ finish the audit trail pattern on pauperwave_associates + user_roles ([a2003c8](https://github.com/Pauperwave/app/commit/a2003c8))
- **ui:** ✨ show who/when updated across associates + wanted-cards tables ([1c00c24](https://github.com/Pauperwave/app/commit/1c00c24))
- **ui:** ✨ add "Creato il" to wanted-cards, unify audit-column labels, backfill nulls ([d6cedfe](https://github.com/Pauperwave/app/commit/d6cedfe))
- **ui:** ✨ add a visible actions column to associates and wanted-cards ([95a40ee](https://github.com/Pauperwave/app/commit/95a40ee))
- **ui:** ✨ bring transactions' audit trail and actions column in line ([e4da0ae](https://github.com/Pauperwave/app/commit/e4da0ae))
- **ui:** ✨ use the relative-tooltip date cell everywhere in tables ([e308cb2](https://github.com/Pauperwave/app/commit/e308cb2))
- **associates:** ✨ add a "Scaduti" tab for lapsed renewals ([034a51b](https://github.com/Pauperwave/app/commit/034a51b))

### Fixes

- **associates:** 🐛 make the "Pagamento" column show the actual last renewal ([1509f76](https://github.com/Pauperwave/app/commit/1509f76))
- **release:** 🔖 emoji-tag changelogen's own release commit message ([d38c5f7](https://github.com/Pauperwave/app/commit/d38c5f7))

### Refactors

- **db:** 🏷️ normalize every constraint name to the pk_/uq_/fk_/ck_ convention ([ab5402a](https://github.com/Pauperwave/app/commit/ab5402a))

### Documentation

- **progress:** 📝 activate ADR-010's changelogen plan, seed v0.1.0 baseline tag ([cf27af0](https://github.com/Pauperwave/app/commit/cf27af0))

### ❤️ Contributors

- Emanuele Nardi ([@emanuelenardi](https://github.com/emanuelenardi))

