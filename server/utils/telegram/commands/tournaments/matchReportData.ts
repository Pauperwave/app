// server\utils\telegram\commands\tournaments\matchReportData.ts
// Reads and writes behind the 1v1 result flow (matchReport.ts): a player's open
// table with its report, and the report itself. Service role: reports have no
// client write policy and the pairings are looked up by the linked associate.
import type { PendingReport, ReportStatus } from '#shared/utils/tournaments/matchReport'

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
  isPlayer1: boolean
  opponent: { playerUuid: string, associateUuid: string, name: string }
  report: (PendingReport & { player1GamesWon: number, player2GamesWon: number }) | null
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

// The 1v1 table this associate sits at in a round that is being played (the
// most recent one), or the given pairing if they are at it. Null when they
// have none — including a Commander pod, which has more than two players.
export async function fetchLiveTable(
  associateUuid: string,
  pairingUuid?: string
): Promise<LiveTable | null> {
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
    .or(`player1_uuid.in.(${playerList}),player2_uuid.in.(${playerList})`)
    .eq('round.status', 'in_progress')
    .eq('tournament.status', 'in_progress')
    .not('player2_uuid', 'is', null)
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

  const [opponentResult, reportResult] = await Promise.all([
    supabase
      .from('players')
      .select('uuid, associate_uuid, associate:pauperwave_associates(first_name, last_name)')
      .eq('uuid', opponentPlayerUuid)
      .maybeSingle(),
    supabase
      .from('tournament_match_result_reports')
      .select('reporter_uuid, status, player1_games_won, player2_games_won')
      .eq('pairing_uuid', pairing.uuid)
      .maybeSingle()
  ])
  if (opponentResult.error) throw opponentResult.error
  if (reportResult.error) throw reportResult.error

  const opponent = opponentResult.data as unknown as {
    uuid: string
    associate_uuid: string
    associate: { first_name: string, last_name: string } | null
  } | null
  if (!opponent) return null

  const report = reportResult.data
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
    isPlayer1,
    opponent: {
      playerUuid: opponent.uuid,
      associateUuid: opponent.associate_uuid,
      name: opponent.associate
        ? `${opponent.associate.first_name} ${opponent.associate.last_name}`
        : 'il tuo avversario'
    },
    report: report
      ? {
        reporterUuid: report.reporter_uuid,
        status: report.status as ReportStatus,
        player1GamesWon: report.player1_games_won,
        player2GamesWon: report.player2_games_won
      }
      : null
  }
}

// False when the pairing already has a report (unique on pairing_uuid): two
// taps or both players reporting at once, only the first one counts.
export async function createMatchReport(
  table: LiveTable,
  games: { player1GamesWon: number, player2GamesWon: number }
): Promise<boolean> {
  const { error } = await telegramServiceSupabaseClient()
    .from('tournament_match_result_reports')
    .insert({
      tournament_uuid: table.tournamentUuid,
      pairing_uuid: table.pairingUuid,
      reporter_uuid: table.myPlayerUuid,
      player1_games_won: games.player1GamesWon,
      player2_games_won: games.player2GamesWon
    })

  if (error?.code === '23505') return false
  if (error) throw error
  return true
}

export async function disputeMatchReport(pairingUuid: string) {
  const { error } = await telegramServiceSupabaseClient()
    .from('tournament_match_result_reports')
    .update({ status: 'disputed' })
    .eq('pairing_uuid', pairingUuid)
    .eq('status', 'pending')
  if (error) throw error
}
