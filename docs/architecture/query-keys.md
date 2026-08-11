# Query Key Naming Convention

<!-- docs\architecture\query-keys.md -->

Reference guide for every `useAsyncData` and Pinia Colada `useQuery` key used across the codebase — mirrors `MagicTheGathering/league`'s `docs/architecture/async-data-keys.md`. Following a consistent naming convention prevents key collisions that cause runtime warnings and stale data, and gives every future migration a single place to check "is this key already taken?" before picking one.

## Convention

Both `useAsyncData` string keys and Pinia Colada array keys follow the same shape:

```
{domain}[-{scope}][-{id}]
```

- **domain** — what is being fetched (`associates`, `wanted-cards`, `events`)
- **scope** — how it is filtered or grouped, when relevant (`by-league`, `by-event`)
- **id** — the specific identifier, when the key is per-entity rather than global

Rules:

1. **Always kebab-case**, lowercase with hyphens — no camelCase or snake_case segments.
2. **Never a bare/ambiguous domain word** if more than one composable could plausibly want it — check this table first.
3. **Reactive keys** (`useAsyncData`'s function form, or Colada's `key: () => [...]`) whenever the key depends on a ref/computed — a static key on reactive input silently serves stale data instead of refetching.
4. Pinia Colada keys are arrays (`['associates']`), not strings — the array segments follow the same domain/scope/id shape as the string convention above, one value per segment.

## Current key inventory

### Pinia Colada `useQuery` keys (ADR-007/ADR-009)

Domains migrated to Pinia Colada — shared cache across every mount of the same key, unlike `useAsyncData` (see `PROGRESS.md` ADR-007's `wanted-cards` bug and the 2026-08-11 associates migration).

| Composable | Key | Invalidated by |
|---|---|---|
| `wantedCards/useWantedCardsQuery.ts` | `['wanted-cards']` | `useWantedCardsMutations` |
| `associates/useAssociatesQuery.ts` | `['associates']` | `useAssociateMutations` |
| `associates/useAssociateGeocodesQuery.ts` | `['associate-geocodes']` | read-only (geocodes are written by `scripts/geocode-associates.mjs`, not from the app) |
| `useScryfallCardSearch.ts` | `['scryfall-printings', cardName]` | read-only (Scryfall data, cached indefinitely per name) |
| `events/useEventsQuery.ts` | `['events']` | read-only — no mutations composable yet, mock data (see below) |
| `leagues/useLeaguesQuery.ts` | `['leagues']` | read-only — no mutations composable yet, mock data (see below) |
| `tournaments/useTournamentsQuery.ts` | `['tournaments']` | read-only — no mutations composable yet, mock data (see below) |

**Persistence note:** `colada.options.ts`'s `PiniaColadaCachePersister` persists every query to `localStorage` by default (ADR-009). `associates` and `associate-geocodes` are explicitly excluded via its `filter` option — associate records carry PII (tax code, address, phone, email) that should not sit in `localStorage` indefinitely. Any future query domain that also carries PII should be added to `PERSISTENCE_EXCLUDED_KEYS` in `colada.options.ts`, not left to the default.

**Mock-backed domains (`events`/`leagues`/`tournaments`):** migrated to `useQuery` on 2026-08-11 even though `server/api/{events,leagues,tournaments}.ts` still return static mock data, not a Supabase read — see `docs/architecture/api.md`. The goal was the calling convention, not caching (mocks are cheap, there was no observed staleness bug like the associates one): every consumer already destructures `data`/`isLoading` the same way real domains do, so when the real tables land (league integration, ADR-003) only the `query()` body changes, not every page that reads the list. No mutations composable exists for them yet — nothing is writable server-side.

### `useAsyncData` keys (not yet migrated)

Domains still on the `useAsyncData` + `useSupabaseClient`/`$fetch` pattern — see `docs/BACKLOG.md` for migration order. Each of these refetches on every component mount even when reusing the same key across pages (the exact bug the Pinia Colada migration above fixes), so treat a second consumer of any of these as a signal to migrate rather than to add a second `useAsyncData` call with the same key.

| Composable | Key | Notes |
|---|---|---|
| `cittadino/useCittadinoQuery.ts` | `` `cittadino-${selectedEdition ?? 'latest'}` `` | reactive (function form), mock data |
| `standings/useFormatStandingsQuery.ts` | `` `standings-${format}-${selectedLeague ?? 'current'}` `` | reactive (function form), mock data |

## Adding a new key

Before adding a new `useAsyncData` or `useQuery` call:

1. **Does a composable already fetch this data?** Reuse it instead of adding a second fetch under a different key.
2. **New domain, not just a new consumer of an existing one?** Follow `useWantedCardsQuery.ts`/`useWantedCardsMutations.ts` as the template (Pinia Colada, not `useAsyncData` — see `docs/architecture/api.md`), and register the key in this file.
3. **Is the key reactive?** Wrap it in Colada's `key: () => [...]` or `useAsyncData`'s function form — a static key with reactive underlying params silently serves stale data.
4. **Does the data carry PII?** Add the key to `PERSISTENCE_EXCLUDED_KEYS` in `colada.options.ts` if it does.

## See also

- `docs/architecture/api.md` — the BFF read/write split (Colada reads client-side, writes go through `server/api/*`)
- `docs/PROGRESS.md` — ADR-007 (Colada alignment with `league`), ADR-009 (cache persistence)
