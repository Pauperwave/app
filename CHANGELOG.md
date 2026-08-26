# Changelog


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

