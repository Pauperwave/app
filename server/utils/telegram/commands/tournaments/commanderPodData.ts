// server\utils\telegram\commands\tournaments\commanderPodData.ts
// Reads behind the real Commander pod flow (commanderReport.ts): a player's
// open pod (3-4 seats), their own saved result/commander, and the pod's live
// score summary. Service role: looked up by the linked associate, not an
// authenticated client session — same pattern as matchReportData.ts's own
// fetchLiveTable, just for a 3-4-seat pairing instead of a 1v1 one.
import {
  buildPosValues, calculatePlayerTableScore,
  type CommanderTableResult, type PlayerTableScore
} from '#shared/utils/tournaments/commanderScoring'

export interface LivePodSeat {
  playerUuid: string
  associateUuid: string
  name: string
}

export interface LivePod {
  pairingUuid: string
  tournamentUuid: string
  tournamentName: string
  roundNumber: number
  tableNumber: number | null
  pairingStatus: string
  myPlayerUuid: string
  opponents: LivePodSeat[]
  myPosition: number | null
  myCommanderDeckUuid: string | null
  myCommanderName: string | null
  // killedPlayerUuid values this player has already recorded this pod —
  // includes their own uuid for a self-kill (suicide).
  myKilledUuids: string[]
  myVoteByType: { brew: string | null, play: string | null }
}

interface PairingRow {
  uuid: string
  tournament_uuid: string
  table_number: number | null
  status: string
  player1_uuid: string | null
  player2_uuid: string | null
  player3_uuid: string | null
  player4_uuid: string | null
  round: { round_number: number }
  tournament: { name: string }
}

const PAIRING_SELECT = `
  uuid, tournament_uuid, table_number, status,
  player1_uuid, player2_uuid, player3_uuid, player4_uuid,
  round:tournament_rounds!inner(round_number, status),
  tournament:tournaments!inner(name, status)
`

// The Commander pod (3-4 seats) this associate sits at in a round being
// played, or the given pairing if they are at it — the mirror-image filter
// of matchReportData.ts's fetchLiveTable (player3_uuid not null instead of
// null).
export async function fetchLivePod(
  associateUuid: string, pairingUuid?: string
): Promise<LivePod | null> {
  const supabase = telegramServiceSupabaseClient()

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('uuid')
    .eq('associate_uuid', associateUuid)
  if (playersError) throw playersError

  const playerList = (players ?? []).map(player => player.uuid).join(',')
  if (!playerList) return null

  let query = supabase
    .from('tournament_pairings')
    .select(PAIRING_SELECT)
    .or([1, 2, 3, 4].map(seat => `player${seat}_uuid.in.(${playerList})`).join(','))
    .eq('round.status', 'in_progress')
    .eq('tournament.status', 'in_progress')
    .not('player3_uuid', 'is', null)
  if (pairingUuid) query = query.eq('uuid', pairingUuid)

  const { data: pairings, error: pairingError } = await query
    .order('created_at', { ascending: false })
    .limit(1)
  if (pairingError) throw pairingError

  const pairing = (pairings as unknown as PairingRow[] | null)?.[0]
  if (!pairing) return null

  const seatUuids = [
    pairing.player1_uuid, pairing.player2_uuid, pairing.player3_uuid, pairing.player4_uuid
  ].filter((uuid): uuid is string => uuid !== null)
  const myPlayerUuid = seatUuids.find(uuid => playerList.split(',').includes(uuid))
  if (!myPlayerUuid) return null
  const opponentUuids = seatUuids.filter(uuid => uuid !== myPlayerUuid)

  const [opponentsResult, myResultRow, myKillRows, myVoteRows] = await Promise.all([
    supabase
      .from('players')
      .select('uuid, associate_uuid, associate:pauperwave_associates(first_name, last_name)')
      .in('uuid', opponentUuids),
    supabase
      .from('tournament_round_results')
      .select('position, commander_deck_uuid, commander:commander_decks(commander_1_name, commander_2_name)')
      .eq('pairing_uuid', pairing.uuid)
      .eq('player_uuid', myPlayerUuid)
      .maybeSingle(),
    supabase
      .from('tournament_kills')
      .select('killed_player_uuid')
      .eq('pairing_uuid', pairing.uuid)
      .eq('killer_uuid', myPlayerUuid),
    supabase
      .from('tournament_votes')
      .select('vote_type, voted_player_uuid')
      .eq('pairing_uuid', pairing.uuid)
      .eq('voter_uuid', myPlayerUuid)
  ])
  if (opponentsResult.error) throw opponentsResult.error
  if (myResultRow.error) throw myResultRow.error
  if (myKillRows.error) throw myKillRows.error
  if (myVoteRows.error) throw myVoteRows.error

  const opponentsData = opponentsResult.data as unknown as {
    uuid: string
    associate_uuid: string
    associate: { first_name: string, last_name: string } | null
  }[]
  const opponents = opponentsData.map(opponent => ({
    playerUuid: opponent.uuid,
    associateUuid: opponent.associate_uuid,
    name: opponent.associate ? `${opponent.associate.first_name} ${opponent.associate.last_name}` : 'un avversario'
  }))

  const commander = myResultRow.data?.commander as unknown as
    { commander_1_name: string, commander_2_name: string | null } | null
  const myCommanderName = commander
    ? [commander.commander_1_name, commander.commander_2_name].filter(Boolean).join(' + ')
    : null

  const voteByType = { brew: null as string | null, play: null as string | null }
  for (const vote of myVoteRows.data) {
    if (vote.vote_type === 'brew' || vote.vote_type === 'play') voteByType[vote.vote_type] = vote.voted_player_uuid
  }

  return {
    pairingUuid: pairing.uuid,
    tournamentUuid: pairing.tournament_uuid,
    tournamentName: pairing.tournament.name,
    roundNumber: pairing.round.round_number,
    tableNumber: pairing.table_number,
    pairingStatus: pairing.status,
    myPlayerUuid,
    opponents,
    myPosition: myResultRow.data?.position ?? null,
    myCommanderDeckUuid: myResultRow.data?.commander_deck_uuid ?? null,
    myCommanderName,
    myKilledUuids: myKillRows.data.map(row => row.killed_player_uuid),
    myVoteByType: voteByType
  }
}

// The whole pod's current standing, scored with the exact same formula the
// web app uses (shared/utils/tournaments/commanderScoring.ts) — null until
// this player has a position (calculatePlayerTableScore's own rule).
export async function fetchPodScoreSummary(pod: LivePod): Promise<PlayerTableScore | null> {
  const supabase = telegramServiceSupabaseClient()
  const seatUuids = [pod.myPlayerUuid, ...pod.opponents.map(o => o.playerUuid)]

  const [resultsRows, killRows, voteRows, ruleset] = await Promise.all([
    supabase
      .from('tournament_round_results')
      .select('player_uuid, position')
      .eq('pairing_uuid', pod.pairingUuid),
    supabase
      .from('tournament_kills')
      .select('killer_uuid')
      .eq('pairing_uuid', pod.pairingUuid),
    supabase
      .from('tournament_votes')
      .select('voted_player_uuid, vote_type')
      .eq('pairing_uuid', pod.pairingUuid),
    fetchRulesetPoints(supabase, pod.tournamentUuid)
  ])
  if (resultsRows.error) throw resultsRows.error
  if (killRows.error) throw killRows.error
  if (voteRows.error) throw voteRows.error

  const positionByPlayer = new Map(resultsRows.data.map(row => [row.player_uuid, row.position]))
  const tableResults: CommanderTableResult[] = seatUuids.map(playerUuid => ({
    playerUuid,
    position: positionByPlayer.get(playerUuid) ?? null,
    numberOfKills: killRows.data.filter(row => row.killer_uuid === playerUuid).length,
    brewVotesReceived: voteRows.data.filter(row => row.voted_player_uuid === playerUuid && row.vote_type === 'brew').length,
    playVotesReceived: voteRows.data.filter(row => row.voted_player_uuid === playerUuid && row.vote_type === 'play').length
  }))

  return calculatePlayerTableScore(pod.myPlayerUuid, tableResults, buildPosValues(ruleset), ruleset)
}
