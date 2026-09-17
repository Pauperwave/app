// app\composables\tournaments\rounds\useTournamentVotesMutations.ts
// Brew/play voting writes — ported from MagicTheGathering/league's
// TournamentVotesModal.vue/DeckPlayVotesModal.vue -> saveVote flow (user
// request, 2026-09-15/16: copy the vote logic as-is). One brew vote + one
// play vote per voter per pairing, single-select each — league's *current*
// code (not the older "up to 2 play votes" some docs describe). The BFF
// endpoint replaces any existing vote of that type for this voter/pairing
// before inserting, since the DB's uq_tournament_votes_unique_vote
// constraint only blocks an exact duplicate, not a second different choice.
export interface VotePayload {
  pairingUuid: string
  voterUuid: string
  votedPlayerUuid: string
  voteType: 'brew' | 'play'
}

export function useTournamentVotesMutations(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const invalidate = () =>
    queryCache.invalidateQueries({ key: TOURNAMENT_VOTES_KEY(toValue(tournamentUuid)) })

  const castVote = useMutation({
    mutation: (payload: VotePayload) =>
      $fetch('/api/tournament-votes/create', {
        method: 'POST',
        body: { tournamentUuid: toValue(tournamentUuid), ...payload }
      }),
    onSettled: invalidate
  })

  const removeVote = useMutation({
    mutation: (voteUuid: string) =>
      $fetch('/api/tournament-votes/delete', { method: 'POST', body: { voteUuid } }),
    onSettled: invalidate
  })

  return { castVote, removeVote }
}
