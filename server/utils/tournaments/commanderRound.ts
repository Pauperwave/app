// server\utils\tournaments\commanderRound.ts
// Writing a Commander pod's data, shared by the organizer's endpoints (commander-decks/select,
// tournament-round-results/upsert, tournament-kills/*, tournament-votes/*) and the Telegram bot's
// self-service flow (commanderReport.ts). Each caller applies its own authorization first
// (requireManagementPermission, or "is this player seated at this pairing").
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Get-or-create the player's commander_decks row for this commander/partner combo
// (uq_commander_decks_single/ uq_commander_decks_partner enforce one deck per combo), then point
// this pairing's round result at it. Upserts, since nothing pre-creates the
// tournament_round_results row: an update-only write would silently no-op.
export async function selectCommanderDeck(supabase: SupabaseClient<Database>, input: {
  tournamentUuid: string
  pairingUuid: string
  playerUuid: string
  commander1Name: string
  commander2Name: string | null
}): Promise<string> {
  let deckQuery = supabase
    .from('commander_decks')
    .select('uuid')
    .eq('player_uuid', input.playerUuid)
    .eq('commander_1_name', input.commander1Name)
  deckQuery = input.commander2Name
    ? deckQuery.eq('commander_2_name', input.commander2Name)
    : deckQuery.is('commander_2_name', null)

  const { data: existingDeck, error: findError } = await deckQuery.maybeSingle()
  if (findError) throw createError({ statusCode: 500, statusMessage: findError.message })

  let deckUuid = existingDeck?.uuid
  if (!deckUuid) {
    const { data: createdDeck, error: insertError } = await supabase
      .from('commander_decks')
      .insert({
        player_uuid: input.playerUuid,
        commander_1_name: input.commander1Name,
        commander_2_name: input.commander2Name
      })
      .select('uuid')
      .single()
    if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })
    deckUuid = createdDeck.uuid
  }

  const { error: resultError } = await supabase
    .from('tournament_round_results')
    .upsert({
      tournament_uuid: input.tournamentUuid,
      pairing_uuid: input.pairingUuid,
      player_uuid: input.playerUuid,
      commander_deck_uuid: deckUuid
    }, { onConflict: 'pairing_uuid,player_uuid' })
  if (resultError) throw createError({ statusCode: 500, statusMessage: resultError.message })

  return deckUuid
}

// Unlinks the commander from this pairing's result row only; the shared commander_decks row and the
// placement are untouched
export async function clearCommanderDeck(supabase: SupabaseClient<Database>, input: {
  pairingUuid: string
  playerUuid: string
}) {
  const { error } = await supabase
    .from('tournament_round_results')
    .update({ commander_deck_uuid: null })
    .eq('pairing_uuid', input.pairingUuid)
    .eq('player_uuid', input.playerUuid)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

// One seat's placement. Unlike the organizer's whole-pod upsert (which completes the pairing at
// once), the bot writes one player at a time: the pairing completes once every seat has a position
// (maybeCompletePairing)
export async function saveCommanderPosition(supabase: SupabaseClient<Database>, input: {
  tournamentUuid: string
  pairingUuid: string
  playerUuid: string
  position: number
}) {
  const { error } = await supabase
    .from('tournament_round_results')
    .upsert({
      tournament_uuid: input.tournamentUuid,
      pairing_uuid: input.pairingUuid,
      player_uuid: input.playerUuid,
      position: input.position
    }, { onConflict: 'pairing_uuid,player_uuid' })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  await maybeCompletePairing(supabase, input.pairingUuid)
}

// Marks the pairing completed once every real seat (player1..4uuid, however many are non-null) has
// a position: the organizer's upsert does it unconditionally, but a self-service write only covers
// one seat
async function maybeCompletePairing(supabase: SupabaseClient<Database>, pairingUuid: string) {
  const { data: pairing, error: pairingError } = await supabase
    .from('tournament_pairings')
    .select('player1_uuid, player2_uuid, player3_uuid, player4_uuid')
    .eq('uuid', pairingUuid)
    .single()
  if (pairingError) throw createError({ statusCode: 500, statusMessage: pairingError.message })

  const seatCount = [
    pairing.player1_uuid, pairing.player2_uuid, pairing.player3_uuid, pairing.player4_uuid
  ].filter((uuid): uuid is string => uuid !== null).length

  const { count, error: resultsError } = await supabase
    .from('tournament_round_results')
    .select('uuid', { count: 'exact', head: true })
    .eq('pairing_uuid', pairingUuid)
    .not('position', 'is', null)
  if (resultsError) throw createError({ statusCode: 500, statusMessage: resultsError.message })
  if ((count ?? 0) < seatCount) return

  const { error: statusError } = await supabase
    .from('tournament_pairings')
    .update({ status: 'completed' })
    .eq('uuid', pairingUuid)
  if (statusError) throw createError({ statusCode: 500, statusMessage: statusError.message })
}

export async function recordKill(supabase: SupabaseClient<Database>, input: {
  tournamentUuid: string
  pairingUuid: string
  killerUuid: string
  killedPlayerUuid: string
}) {
  const { error } = await supabase.from('tournament_kills').insert({
    tournament_uuid: input.tournamentUuid,
    pairing_uuid: input.pairingUuid,
    killer_uuid: input.killerUuid,
    killed_player_uuid: input.killedPlayerUuid
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // A kill contradicts an earlier "no kills at this table" confirmation
  await setPairingNoKills(supabase, { pairingUuid: input.pairingUuid, noKills: false })
}

// Confirms (or retracts) that the table ended without any kill; only valid while it has none
export async function setPairingNoKills(supabase: SupabaseClient<Database>, input: {
  pairingUuid: string
  noKills: boolean
}) {
  if (input.noKills) {
    const { count, error: countError } = await supabase
      .from('tournament_kills')
      .select('*', { count: 'exact', head: true })
      .eq('pairing_uuid', input.pairingUuid)
    if (countError) throw createError({ statusCode: 500, statusMessage: countError.message })
    if ((count ?? 0) > 0) {
      throw createError({ statusCode: 409, statusMessage: 'This table already has kills recorded' })
    }
  }

  const { error } = await supabase
    .from('tournament_pairings')
    .update({ no_kills: input.noKills })
    .eq('uuid', input.pairingUuid)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

// By killer/killed pair rather than a uuid: the bot's multiselect toggles kills from a re-rendered
// button grid and never holds a row uuid
export async function removeKillBetween(supabase: SupabaseClient<Database>, input: {
  pairingUuid: string
  killerUuid: string
  killedPlayerUuid: string
}) {
  const { error } = await supabase
    .from('tournament_kills')
    .delete()
    .eq('pairing_uuid', input.pairingUuid)
    .eq('killer_uuid', input.killerUuid)
    .eq('killed_player_uuid', input.killedPlayerUuid)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

// Single-select per category: replaces this voter's existing vote of this type for the pairing
// (like tournament-votes/create.post.ts)
export async function castVote(supabase: SupabaseClient<Database>, input: {
  tournamentUuid: string
  pairingUuid: string
  voterUuid: string
  votedPlayerUuid: string
  voteType: 'brew' | 'play'
}) {
  const { error: deleteError } = await supabase
    .from('tournament_votes')
    .delete()
    .eq('pairing_uuid', input.pairingUuid)
    .eq('voter_uuid', input.voterUuid)
    .eq('vote_type', input.voteType)
  if (deleteError) throw createError({ statusCode: 500, statusMessage: deleteError.message })

  const { error } = await supabase.from('tournament_votes').insert({
    tournament_uuid: input.tournamentUuid,
    pairing_uuid: input.pairingUuid,
    voter_uuid: input.voterUuid,
    voted_player_uuid: input.votedPlayerUuid,
    vote_type: input.voteType
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}
