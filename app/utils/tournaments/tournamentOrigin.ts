// app\utils\tournaments\tournamentOrigin.ts
// A tournament's detail page can be reached from several places (the flat /tournaments grid, a
// league's grid, ...). When it belongs to a league its link always carries `?league=<uuid>`: "part
// of league X" is a fact about the tournament, regardless of entry point. The detail page reads it
// back to show a "back to league" link that route params alone can't express (see
// useBreadcrumbs.ts's override mechanism). A query param, not a nested route (docs/PROGRESS.md): a
// tournament's parent is optional and polymorphic (league, event or neither), so the canonical URL
// stays flat.
//
// Plain `?league=<uuid>` rather than a typed `?from=league:<uuid>`: only one origin type exists, so
// a prefix has nothing to disambiguate yet. Add a separate param (e.g. `?event=<uuid>`) if a second
// origin appears.
import type { Tournament } from '~/types'

export type NavigationOrigin = { type: 'league', uuid: string }

export function tournamentDetailUrl(tournament: Pick<Tournament, 'uuid' | 'leagueUuid'>): string {
  return tournament.leagueUuid
    ? `/tournaments/${tournament.uuid}?league=${tournament.leagueUuid}`
    : `/tournaments/${tournament.uuid}`
}

export function parseNavigationOrigin(league: unknown): NavigationOrigin | null {
  return typeof league === 'string' && league ? { type: 'league', uuid: league } : null
}
