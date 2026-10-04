// server\utils\telegram\commands\tournaments\matchReportData.ts
// Reads behind the 1v1 result flow (matchReport.ts): a player's open table with its saved result,
// if any. Service role: the pairings/results are looked up by the linked associate, not by an
// authenticated client session.
import type { ReportedResult } from '#shared/utils/tournaments/matchReport'

export interface LiveTable {
  pairingUuid: string
  tournamentUuid: string
  tournamentName: string
  roundNumber: number
  tableNumber: number | null
  pairingStatus: string
  player1Uuid: string
  player2Uuid: string
  myPlayerUuid: string
  /** The viewer's own name: what the opponent reads when the viewer acts on the result. */
  myName: string
  /** Their first name alone, for where the full one is too long (the turns Mini App). */
  myFirstName: string | null
  isPlayer1: boolean
  opponent: { playerUuid: string, associateUuid: string, name: string, firstName: string | null }
  result: (ReportedResult & { player1GamesWon: number, player2GamesWon: number }) | null
}

interface PairingRow {
  uuid: string
  tournament_uuid: string
  table_number: number | null
  status: string
  player1_uuid: string
  player2_uuid: string
  round: { round_number: number }
  tournament: { name: string }
}

const PAIRING_SELECT = `
  uuid, tournament_uuid, table_number, status, player1_uuid, player2_uuid,
  round:tournament_rounds!inner(round_number, status),
  tournament:tournaments!inner(name, status)
`

// The 1v1 table this associate sits at in the round being played (the most recent one), or the
// given pairing if they are at it. Null when they have none, including a Commander pod (more than
// two players)
export async function fetchLiveTable(
  associateUuid: string,
  pairingUuid?: string
// fallow-ignore-next-line code-duplication -- report lookup mirrors commanderPodData.ts
): Promise<LiveTable | null> {
  const supabase = telegramServiceSupabaseClient()

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('uuid, associate:pauperwave_associates(first_name, last_name)')
    .eq('associate_uuid', associateUuid)
  if (playersError) throw playersError

  const playerList = (players ?? []).map(player => player.uuid).join(',')
  if (!playerList) return null

  // The players of one associate share their name, which the opponent is told when this player acts
  const me = (players?.[0]?.associate ?? null) as { first_name: string, last_name: string } | null
  const myName = me ? `${me.first_name} ${me.last_name}` : 'il tuo avversario'
  const myFirstName = me?.first_name ?? null

  let query = supabase
    .from('tournament_pairings')
    .select(PAIRING_SELECT)
    .or(`player1_uuid.in.(${playerList}),player2_uuid.in.(${playerList})`)
    .eq('round.status', 'in_progress')
    .eq('tournament.status', 'in_progress')
    // fallow-ignore-next-line code-duplication -- mirrors commanderPodData.ts
    .not('player2_uuid', 'is', null)
    // fallow-ignore-next-line code-duplication -- report lookup mirrors commanderPodData.ts
    .is('player3_uuid', null)
  if (pairingUuid) query = query.eq('uuid', pairingUuid)

  const { data: pairings, error: pairingError } = await query
    .order('created_at', { ascending: false })
    .limit(1)
  if (pairingError) throw pairingError

  const pairing = (pairings as unknown as PairingRow[] | null)?.[0]
  if (!pairing) return null

  const myPlayerUuid = playerList.split(',').includes(pairing.player1_uuid)
    ? pairing.player1_uuid
    : pairing.player2_uuid
  const isPlayer1 = myPlayerUuid === pairing.player1_uuid
  const opponentPlayerUuid = isPlayer1 ? pairing.player2_uuid : pairing.player1_uuid

  const [opponentResult, matchResultRow] = await Promise.all([
    supabase
      .from('players')
      .select('uuid, associate_uuid, associate:pauperwave_associates(first_name, last_name)')
      .eq('uuid', opponentPlayerUuid)
      .maybeSingle(),
    supabase
      .from('tournament_match_results')
      .select('reported_by_player_uuid, confirmed_at, disputed_at, player1_games_won, player2_games_won')
      .eq('pairing_uuid', pairing.uuid)
      .maybeSingle()
  ])
  if (opponentResult.error) throw opponentResult.error
  if (matchResultRow.error) throw matchResultRow.error

  const opponent = opponentResult.data as unknown as {
    uuid: string
    associate_uuid: string
    associate: { first_name: string, last_name: string } | null
  } | null
  if (!opponent) return null

  const savedResult = matchResultRow.data
  return {
    pairingUuid: pairing.uuid,
    tournamentUuid: pairing.tournament_uuid,
    tournamentName: pairing.tournament.name,
    roundNumber: pairing.round.round_number,
    tableNumber: pairing.table_number,
    pairingStatus: pairing.status,
    player1Uuid: pairing.player1_uuid,
    player2Uuid: pairing.player2_uuid,
    myPlayerUuid,
    myName,
    myFirstName,
    isPlayer1,
    opponent: {
      playerUuid: opponent.uuid,
      associateUuid: opponent.associate_uuid,
      firstName: opponent.associate?.first_name ?? null,
      name: opponent.associate
        ? `${opponent.associate.first_name} ${opponent.associate.last_name}`
        : 'il tuo avversario'
    },
    // A result an organizer entered directly (no reported_by_player_uuid) has nothing to
    // confirm/dispute: treated as no result
    result: savedResult?.reported_by_player_uuid
      ? {
        reporterUuid: savedResult.reported_by_player_uuid,
        confirmedAt: savedResult.confirmed_at,
        disputedAt: savedResult.disputed_at,
        player1GamesWon: savedResult.player1_games_won,
        player2GamesWon: savedResult.player2_games_won
      }
      : null
  }
}
