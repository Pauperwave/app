# Query Key Naming Convention

<!-- docs\architecture\query-keys.md -->

Reference guide for every Pinia Colada `useQuery` key used across the codebase. Following a consistent naming convention prevents key collisions that cause runtime warnings and stale data, and gives every future domain a single place to check "is this key already taken?" before picking one.

## Convention

```
[domain-name] | [domain-name, scopeId]
```

- **Global domain key** (`['associates']`, `['tournaments']`) — the whole collection, one query shared across every consumer.
- **Scoped key** (`['tournament-payments', tournamentUuid]`, `['commander-decks', playerUuid]`) — per-entity data, the array's second element is the specific identifier.

Rules:

1. **Always kebab-case** domain segments.
2. **Never a bare/ambiguous domain word** if more than one composable could plausibly want it — check the inventory below first.
3. **Reactive keys** (`key: () => [...]`) whenever the key depends on a ref/computed — a static key on reactive input silently serves stale data instead of refetching.
4. Export the key as a named constant (`export const X_KEY = [...]` or a function for scoped keys) from the `use<Domain>Query.ts` file that owns it — a mutations composable invalidates by importing the same constant, not by re-typing the array.

## Current key inventory

| Composable | Key | Mutations composable |
|---|---|---|
| `wantedCards/useWantedCardsQuery.ts` | `['wanted-cards']` | `useWantedCardsMutations.ts` |
| `associates/useAssociatesQuery.ts` | `['associates']` | `useAssociatesMutations.ts` |
| `associates/useAssociateRenewalsQuery.ts` | `['associate-renewals']` | — (written via `associates/renew.post.ts`/`approve-renewal.post.ts`, invalidates this key) |
| `associates/useAssociateMembershipEventsQuery.ts` | `['associate-membership-events', associateUuid]` | — (append-only log, written as a side effect of other associate mutations) |
| `associates/useAssociatesGeocodesQuery.ts` | `['associate-geocodes']` | read-only (written by `scripts/geocode-associates.mjs`, not from the app) |
| `associates/usePendingRenewalRequestsQuery.ts` | `['pending-renewal-requests']` | read-only (derived from `associates`/membership events) |
| `events/useEventsQuery.ts` | `['events']` | `useEventsMutations.ts` |
| `leagues/useLeaguesQuery.ts` | `['leagues']` | `useLeaguesMutations.ts` |
| `locations/useLocationsQuery.ts` | `['locations']` | `useLocationsMutations.ts` |
| `mtgFormats/useMtgFormatsQuery.ts` | `['mtg-formats']` | `useMtgFormatsMutations.ts` |
| `organizations/useOrganizationsQuery.ts` | `['organizations']` | read-only |
| `players/usePlayersQuery.ts` | `['players']` | `usePlayersMutations.ts` |
| `players/usePlayersLastLoginsQuery.ts` | `['players-last-logins']` | read-only (login history) |
| `players/useCommanderDecksQuery.ts` | `['commander-decks', playerUuid]` | read-only for now |
| `players/useCommanderMatchHistoryQuery.ts` | `['commander-match-history', playerUuid]` | read-only |
| `players/usePlayerLoginHistoryQuery.ts` | `['player-login-history', userId]` | read-only |
| `rulesets/useRulesetsQuery.ts` | `['rulesets']` | written via `leagues/[id]/ruleset.post.ts` (a ruleset is assigned per-league, not CRUD'd standalone) |
| `settings/useMembersQuery.ts` | `['settings-members']` | `useMembersMutations.ts` |
| `settings/useSettingsQuery.ts` | `['settings']` | `useSettingsMutations.ts` |
| `tournaments/useTournamentsQuery.ts` | `['tournaments']` | `useTournamentsMutations.ts` |
| `tournaments/useTournamentPaymentsQuery.ts` | `['tournament-payments', tournamentUuid]` | invalidated by `useTournamentRegistrationsMutations.ts` |
| `tournaments/useTournamentRegistrationsQuery.ts` | `['tournament-registrations', tournamentUuid]` | `useTournamentRegistrationsMutations.ts` |
| `transactions/useTransactionsQuery.ts` | `['transactions']` | `useTransactionsMutations.ts` |
| `trash/useTrashQuery.ts` | `['trash']` | `useTrashMutations.ts` |
| `useUserRole.ts` | `['user-role']` | written via `assign_role` RPC (`useMembersMutations.ts`), invalidated on auth state change (`app/plugins/user-role.client.ts`) — see `docs/architecture/roles.md` |
| `useScryfallCardSearch.ts` | `['scryfall-printings', cardName]` | read-only (Scryfall data, cached indefinitely per name) |

**Mock-backed domains (`cittadino`, `standings`) don't use Pinia Colada** — `cittadino/useCittadinoQuery.ts` and `standings/useFormatStandingsQuery.ts` still use `useAsyncData` with a reactive string key (`` `cittadino-${edition}` ``, `` `standings-${format}-${league}` ``), since there's no real table to query yet (see `docs/architecture/api.md`). Migrate to `useQuery` once a real backing table lands.

**Persistence note:** `colada.options.ts`'s `PiniaColadaCachePersister` persists every query to `localStorage` by default (ADR-009 in `docs/PROGRESS.md`). Only three keys are actually excluded via its `filter` option (`PERSISTENCE_EXCLUDED_KEYS`): `associates`, `associate-geocodes`, `user-role`. **Not yet excluded despite carrying personal data:** `associate-renewals`, `associate-membership-events`, `settings-members`, `player-login-history`, `players-last-logins` — worth a pass to close, same class of gap as the enforcement issues found in `docs/architecture/permissions.md`'s notes. Any future query domain that carries PII should be added to `PERSISTENCE_EXCLUDED_KEYS`, not left to the default.

## Adding a new key

Before adding a new `useQuery` call:

1. **Does a composable already fetch this data?** Reuse it instead of adding a second fetch under a different key.
2. **New domain, not just a new consumer of an existing one?** Follow `useWantedCardsQuery.ts`/`useWantedCardsMutations.ts` as the template (see `docs/architecture/api.md`), and register the key in this file.
3. **Is the key reactive?** Wrap it in `key: () => [...]` — a static key with reactive underlying params silently serves stale data.
4. **Does the data carry PII?** Add the key to `PERSISTENCE_EXCLUDED_KEYS` in `colada.options.ts` if it does.

## See also

- `docs/architecture/api.md` — the BFF read/write split (Colada reads client-side, writes go through `server/api/*`)
- `docs/PROGRESS.md` — ADR-007 (Colada adoption), ADR-009 (cache persistence)
