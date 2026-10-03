// server\utils\telegram\commands\tournaments\commanderPodData.ts
// Reads behind the real Commander pod flow (commanderReport.ts): a player's open pod (3-4 seats),
// their saved result/commander and the pod's live score summary. Service role, looked up by the
// linked associate; the 3-4-seat counterpart of matchReportData.ts's fetchLiveTable.
import {
  buildPosValues, calculatePlayerTableScore,
  type CommanderTableResult, type PlayerTableScore
} from '#shared/utils/tournaments/commanderScoring'
import {
  buildCommanderUsageByPlayer, sortCommandersByRecency
} from '#shared/utils/commanders/commanderUsage'
import { pendingSeatNames } from './commanderPodCompletion'

export interface LivePodSeat {
  playerUuid: string
  associateUuid: string
  name: string
}

export interface LivePod {
  pairingUuid: string
  tournamentUuid: string
  tournamentName: string
  roundUuid: string
  roundNumber: number
  roundCount: number | null
  tableNumber: number | null
  pairingStatus: string
  myPlayerUuid: string
  opponents: LivePodSeat[]
  myPosition: number | null
  myCommanderDeckUuid: string | null
  myCommanderName: string | null
  // The pieces of myCommanderName, for rules depending on the first commander
  myCommander1Name: string | null
  myCommander2Name: string | null
  /** True once this player dropped from the tournament (from the next round on). */
  myDropped: boolean
  // killedPlayerUuid values already recorded this pod, including their own uuid for a self-kill
  myKilledUuids: string[]
  myVoteByType: { brew: string | null, play: string | null }
}

interface PairingRow {
  uuid: string
  tournament_uuid: string
  table_number: number | null
  status: string
  round_uuid: string
  player1_uuid: string | null
  player2_uuid: string | null
  player3_uuid: string | null
  player4_uuid: string | null
  round: { round_number: number }
  tournament: { name: string, round_count: number | null }
}

const PAIRING_SELECT = `
  uuid, tournament_uuid, table_number, status, round_uuid,
  player1_uuid, player2_uuid, player3_uuid, player4_uuid,
  round:tournament_rounds!inner(round_number, status),
  tournament:tournaments!inner(name, status, round_count)
`

// The Commander pod (3-4 seats) this associate sits at in a round being played, or the given
// pairing if they are at it: the mirror of matchReportData.ts's fetchLiveTable (player3_uuid not
// null)
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

  const [opponentsResult, myResultRow, myKillRows, myVoteRows, myDropRow] = await Promise.all([
    // .order() is load-bearing: commanderPodMessages.ts encodes a kill/vote target as an index into
    // this array and re-resolves the pod on every tap, and `.in()` alone has no ordering guarantee,
    // so an index could map to a different opponent between render and tap
    supabase
      .from('players')
      .select('uuid, associate_uuid, associate:pauperwave_associates(first_name, last_name)')
      .in('uuid', opponentUuids)
      .order('uuid', { ascending: true }),
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
      .eq('voter_uuid', myPlayerUuid),
    supabase
      .from('tournament_player_drops')
      .select('uuid')
      .eq('tournament_uuid', pairing.tournament_uuid)
      .eq('player_uuid', myPlayerUuid)
      .maybeSingle()
  ])
  if (opponentsResult.error) throw opponentsResult.error
  if (myResultRow.error) throw myResultRow.error
  if (myKillRows.error) throw myKillRows.error
  if (myVoteRows.error) throw myVoteRows.error
  if (myDropRow.error) throw myDropRow.error

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
    roundUuid: pairing.round_uuid,
    roundNumber: pairing.round.round_number,
    roundCount: pairing.tournament.round_count,
    tableNumber: pairing.table_number,
    pairingStatus: pairing.status,
    myPlayerUuid,
    opponents,
    myPosition: myResultRow.data?.position ?? null,
    myCommanderDeckUuid: myResultRow.data?.commander_deck_uuid ?? null,
    myCommanderName,
    myCommander1Name: commander?.commander_1_name ?? null,
    myCommander2Name: commander?.commander_2_name ?? null,
    myDropped: myDropRow.data !== null,
    myKilledUuids: myKillRows.data.map(row => row.killed_player_uuid),
    myVoteByType: voteByType
  }
}

export interface CommanderHistoryItem {
  name: string
  count: number
  lastPlayedDay: string
}

// The commanders this associate already played, most recent first: offered before anything else
// when picking (same order as the website)
export async function fetchCommanderHistory(
  associateUuid: string
): Promise<CommanderHistoryItem[]> {
  const supabase = telegramServiceSupabaseClient()

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('uuid')
    .eq('associate_uuid', associateUuid)
  if (playersError) throw playersError

  const playerUuids = (players ?? []).map(player => player.uuid)
  if (playerUuids.length === 0) return []

  const { data: results, error: resultsError } = await supabase
    .from('tournament_round_results')
    .select('commander_deck_uuid, created_at')
    .in('player_uuid', playerUuids)
    .not('commander_deck_uuid', 'is', null)
  if (resultsError) throw resultsError

  const deckUuids = [...new Set(
    results.map(row => row.commander_deck_uuid).filter((uuid): uuid is string => uuid !== null)
  )]
  if (deckUuids.length === 0) return []

  const { data: decks, error: decksError } = await supabase
    .from('commander_decks')
    .select('uuid, commander_1_name, commander_2_name')
    .in('uuid', deckUuids)
  if (decksError) throw decksError

  // Every player row of the associate counts as one history
  const usage = buildCommanderUsageByPlayer(
    results.map(row => ({
      playerUuid: associateUuid,
      commanderDeckUuid: row.commander_deck_uuid,
      createdAt: row.created_at
    })),
    decks.map(deck => ({
      uuid: deck.uuid,
      commander1Name: deck.commander_1_name,
      commander2Name: deck.commander_2_name
    }))
  ).get(associateUuid)

  return sortCommandersByRecency(usage ?? new Map()).map(entry => ({
    name: entry.name,
    count: entry.usage.count,
    lastPlayedDay: entry.usage.lastPlayedDay
  }))
}

export interface VoteReceived {
  voterName: string
  brew: boolean
  play: boolean
}

// Who voted for THIS player (not who they voted for): feeds the "Riepilogo voti ricevuti" table,
// one row per opponent
export async function fetchVotesReceivedFor(pod: LivePod): Promise<VoteReceived[]> {
  const supabase = telegramServiceSupabaseClient()
  const { data, error } = await supabase
    .from('tournament_votes')
    .select('voter_uuid, vote_type')
    .eq('pairing_uuid', pod.pairingUuid)
    .eq('voted_player_uuid', pod.myPlayerUuid)
  if (error) throw error

  return pod.opponents.map((opponent) => {
    const votes = data.filter(row => row.voter_uuid === opponent.playerUuid)
    return {
      voterName: opponent.name,
      brew: votes.some(vote => vote.vote_type === 'brew'),
      play: votes.some(vote => vote.vote_type === 'play')
    }
  })
}

// The pod's current standing, scored with the web app's formula (shared commanderScoring.ts); null
// until this player has a position
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

// Names of the seats (this player included) that haven't set a position and cast both votes
// yet: the follow-up tables wait until this is empty
export async function fetchPendingSeatNames(pod: LivePod): Promise<string[]> {
  const supabase = telegramServiceSupabaseClient()
  const [positions, votes] = await Promise.all([
    supabase
      .from('tournament_round_results')
      .select('player_uuid')
      .eq('pairing_uuid', pod.pairingUuid)
      .not('position', 'is', null),
    supabase
      .from('tournament_votes')
      .select('voter_uuid, vote_type')
      .eq('pairing_uuid', pod.pairingUuid)
  ])
  if (positions.error) throw positions.error
  if (votes.error) throw votes.error

  const seats = [
    { playerUuid: pod.myPlayerUuid, name: 'Tu' },
    ...pod.opponents.map(({ playerUuid, name }) => ({ playerUuid, name }))
  ]
  const positioned = new Set(positions.data.map(row => row.player_uuid))

  return pendingSeatNames(seats, positioned, votes.data)
}
