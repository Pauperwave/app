// app\composables\tournaments\rounds\useDropInfoByPlayerUuid.ts
// Who dropped from a tournament, by player uuid, with the round they dropped in and when — what the
// "Drop R{n}" badge next to a player's name shows. Shared by the Swiss and Commander live
// standings.
import type { SwissDropInfo } from '~/types'

export function useDropInfoByPlayerUuid(tournamentUuid: MaybeRefOrGetter<string>) {
  const { data: rounds } = useTournamentRoundsQuery(tournamentUuid)
  const { data: drops } = useTournamentDropsQuery(tournamentUuid)

  return computed(() => {
    const roundNumberByUuid = new Map((rounds.value ?? []).map(r => [r.uuid, r.roundNumber]))
    return new Map((drops.value ?? []).map(drop => [drop.playerUuid, {
      roundNumber: roundNumberByUuid.get(drop.roundUuid) ?? 0,
      droppedAt: drop.droppedAt
    } satisfies SwissDropInfo]))
  })
}
