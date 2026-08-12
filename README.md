# PauperWave

Gestionale Nuxt 4 per l'associazione **PauperWave**: tesseramenti/rinnovi, incassi, e organizzazione di tornei multi-formato (Commander, Premodern, Draft, Pauper, ecc.).

Stack: Nuxt 4 · Vue 3.5 · Nuxt UI · Supabase (Postgres + RLS) · TypeScript.

## Setup

```bash
pnpm install
```

Richiede un `.env` con le variabili del progetto Supabase collegato (`SUPABASE_URL`, `SUPABASE_KEY`).

## Sviluppo

```bash
pnpm dev            # dev server su http://localhost:3000
```

## Build e produzione

```bash
pnpm build
pnpm preview        # preview locale della build di produzione
```

Vedi la [documentazione di deploy Nuxt](https://nuxt.com/docs/getting-started/deployment) per il deploy effettivo.

## Qualità del codice

```bash
pnpm lint             # eslint . — 0 warning/0 errori richiesti
pnpm typecheck        # nuxt typecheck (vue-tsc) — 0 errori richiesti
pnpm check:paths      # verifica l'header di percorso su ogni file sorgente
pnpm fallow:dead-code # dipendenze/export inutilizzati
pnpm fallow:dupes     # duplicazione di codice
pnpm fallow:audit     # dead-code + complessità + duplicazione sui file modificati
pnpm fallow:health    # audit complessità/hotspot
pnpm fallow:security  # candidati di sicurezza (richiedono verifica manuale)
```

## Test

```bash
pnpm test             # vitest run
pnpm test:watch       # vitest --watch
pnpm test:coverage    # vitest run --coverage
pnpm test:e2e         # playwright test
pnpm test:e2e:headed  # playwright test, headed + rallentato
```

## Supabase

Le migration vivono in `supabase/migrations/` (`YYYYMMDDHHMMSS_descrizione.sql`). Dopo ogni modifica allo schema, rigenera i tipi TypeScript:

```bash
pnpm run supabase:types
```

`shared/utils/types/database.ts` è generato: non va editato a mano.

## Documentazione

`docs/README.md` è l'indice di tutta la documentazione di progetto (architettura, schema DB, backlog, storia delle decisioni).

## Origine

Questo progetto nasce dal [Nuxt Dashboard Template](https://github.com/nuxt-ui-templates/dashboard) di Nuxt UI.
