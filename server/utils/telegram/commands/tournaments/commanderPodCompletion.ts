// server\utils\telegram\commands\tournaments\commanderPodCompletion.ts

// Who at a Commander pod has not finished the result wizard yet. The score and the votes received
// depend on every seat, so the follow-up tables only make sense once nobody is pending.
// Kills are not checked: "no kills" is a valid answer and leaves no row to tell it from "not yet".

interface PodSeat {
  playerUuid: string
  name: string
}

interface PodVote {
  voter_uuid: string
  vote_type: string
}

// A seat is done with a position and both votes (the wizard only offers "Conferma" on a vote step
// once a vote is picked, so a finished player always has both)
export function pendingSeatNames(
  seats: PodSeat[],
  positionedPlayerUuids: Set<string>,
  votes: PodVote[]
): string[] {
  return seats
    .filter((seat) => {
      const hasPosition = positionedPlayerUuids.has(seat.playerUuid)
      const hasVoted = (voteType: string) => votes
        .some(vote => vote.voter_uuid === seat.playerUuid && vote.vote_type === voteType)

      return !(hasPosition && hasVoted('brew') && hasVoted('play'))
    })
    .map(seat => seat.name)
}
