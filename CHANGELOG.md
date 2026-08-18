# Changelog


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

