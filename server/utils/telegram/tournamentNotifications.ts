// server\utils\telegram\tournamentNotifications.ts
// Passive Telegram notifications for tournament events (accepted, tables
// announced/cancelled) — the player doesn't send /tavolo to find out. Every
// entry point is best-effort: the write it follows has already succeeded, so
// a failure here is logged and never propagates.
import {
  registrationAcceptedMessage, roundTablesCancelledMessage, tableAnnouncedMessage,
  tournamentResetMessage
} from '#shared/utils/tournaments/playerNotificationMessages'

import type { AssociateNotifyResult } from '#shared/types/notifications'

import { notifyTelegramAssociates, type AssociateMessage } from './notify'

interface SeatingRow {
  table_number: number | null
  player1_uuid: string | null
  player2_uuid: string | null
  player3_uuid: string | null
  player4_uuid: string | null
  round: { round_number: number }
  tournament: { name: string }
}

interface PlayerRow {
  uuid: string
  associate_uuid: string
  associate: { first_name: string, last_name: string } | null
}

const SEATING_SELECT = `
  table_number, player1_uuid, player2_uuid, player3_uuid, player4_uuid,
  round:tournament_rounds!inner(round_number),
  tournament:tournaments!inner(name)
`

type SeatingScope = { roundUuid: string } | { tournamentUuid: string, roundNumber?: number }

async function fetchSeating(scope: SeatingScope): Promise<SeatingRow[]> {
  const supabase = telegramServiceSupabaseClient()

  let query = supabase.from('tournament_pairings').select(SEATING_SELECT)
  if ('roundUuid' in scope) {
    query = query.eq('round_uuid', scope.roundUuid)
  } else {
    query = query.eq('tournament_uuid', scope.tournamentUuid)
    if (scope.roundNumber !== undefined) query = query.eq('round.round_number', scope.roundNumber)
  }

  const { data, error } = await query.order('table_number', { ascending: true })
  if (error) throw error
  return data as unknown as SeatingRow[]
}

function seatUuids(row: SeatingRow): string[] {
  return [row.player1_uuid, row.player2_uuid, row.player3_uuid, row.player4_uuid]
    .filter((uuid): uuid is string => uuid !== null)
}

async function fetchPlayers(playerUuids: string[]): Promise<Map<string, PlayerRow>> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('players')
    .select('uuid, associate_uuid, associate:pauperwave_associates(first_name, last_name)')
    .in('uuid', playerUuids)
  if (error) throw error

  return new Map((data as unknown as PlayerRow[]).map(player => [player.uuid, player]))
}

function playerName(player: PlayerRow): string {
  return player.associate ? `${player.associate.first_name} ${player.associate.last_name}` : 'un giocatore'
}

// Runs the whole notification, turning any error into a log line + null.
async function bestEffort<T>(action: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await action()
  } catch (error) {
    console.error('Failed to send tournament notifications:', error)
    return fallback
  }
}

// Each seated player is told their own table and who they play with.
export function notifyRoundTables(roundUuid: string): Promise<AssociateNotifyResult | null> {
  return bestEffort(async () => {
    const seating = await fetchSeating({ roundUuid })
    const players = await fetchPlayers(seating.flatMap(seatUuids))
    const usernames = await fetchTelegramUsernames(
      [...players.values()].map(player => player.associate_uuid)
    )

    const messages = seating.flatMap(row => seatUuids(row).flatMap((playerUuid) => {
      const player = players.get(playerUuid)
      if (!player) return []

      const opponents = seatUuids(row)
        .filter(uuid => uuid !== playerUuid)
        .flatMap(uuid => players.get(uuid) ?? [])
        .map(opponent => ({
          name: playerName(opponent),
          telegramUsername: usernames.get(opponent.associate_uuid)
        }))

      return [{
        associateUuid: player.associate_uuid,
        text: tableAnnouncedMessage({
          tournamentName: row.tournament.name,
          roundNumber: row.round.round_number,
          tableNumber: row.table_number,
          opponents
        })
      }]
    }))

    return notifyTelegramAssociates(messages)
  }, null)
}

// Split from the send because the RPCs that cancel tables wipe the pairings:
// the recipients have to be read before, and sent after the RPC succeeds.
// roundNumber omitted = whole tournament (reset).
export function prepareTablesCancelledMessages(
  tournamentUuid: string, roundNumber?: number
): Promise<AssociateMessage[]> {
  return bestEffort(async () => {
    const seating = await fetchSeating({ tournamentUuid, roundNumber })
    const playerUuids = [...new Set(seating.flatMap(seatUuids))]
    const players = await fetchPlayers(playerUuids)

    const tournamentName = seating[0]?.tournament.name
    if (tournamentName === undefined) return []

    const text = roundNumber === undefined
      ? tournamentResetMessage(tournamentName)
      : roundTablesCancelledMessage(tournamentName, roundNumber)

    return [...players.values()].map(player => ({ associateUuid: player.associate_uuid, text }))
  }, [])
}

// Called for registrations that just moved to 'checked_in' — see
// tournament-registrations/status.post.ts.
export function notifyRegistrationsAccepted(
  registrationUuids: string[]
): Promise<AssociateNotifyResult | null> {
  return bestEffort(async () => {
    const supabase = telegramServiceSupabaseClient()

    const { data, error } = await supabase
      .from('tournament_registrations')
      .select('player:players!inner(associate_uuid), tournament:tournaments!inner(name)')
      .in('uuid', registrationUuids)
    if (error) throw error

    const registrations = data as unknown as {
      player: { associate_uuid: string }
      tournament: { name: string }
    }[]

    return notifyTelegramAssociates(registrations.map(registration => ({
      associateUuid: registration.player.associate_uuid,
      text: registrationAcceptedMessage(registration.tournament.name)
    })))
  }, null)
}
