// app\utils\tournaments\tournamentOrigin.ts
// A tournament's detail page can be reached from several places (the flat
// /tournaments grid, a league's own tournament grid, eventually an event's).
// When it belongs to a league, its link always carries a `?from=league:<uuid>`
// query param — not because of *how* the visitor navigated there, but because
// "this tournament is part of league X" is a fact about the tournament
// itself, true regardless of entry point. The detail page reads it back to
// show a "back to league" link the plain route params alone can't express
// (see useBreadcrumbs.ts's own override mechanism for the same class of
// problem). A query param, not a nested route: see docs/PROGRESS.md's
// reasoning against nesting tournaments under /leagues/<uuid>/tournaments/
// <uuid> — a tournament's parent is optional and polymorphic (league OR
// event OR neither), so the canonical URL stays flat.
import type { Tournament } from '~/types'

export type NavigationOrigin = { type: 'league', uuid: string }

export function tournamentDetailUrl(tournament: Pick<Tournament, 'uuid' | 'leagueUuid'>): string {
  return tournament.leagueUuid
    ? `/tournaments/${tournament.uuid}?from=league:${tournament.leagueUuid}`
    : `/tournaments/${tournament.uuid}`
}

export function parseNavigationOrigin(from: unknown): NavigationOrigin | null {
  if (typeof from !== 'string') return null
  const [type, uuid] = from.split(':')
  return type === 'league' && uuid ? { type, uuid } : null
}
