# Changelog


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

