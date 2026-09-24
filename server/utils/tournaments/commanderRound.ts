// server\utils\tournaments\commanderRound.ts
// Writing a Commander pod's own data — shared by the organizer's endpoints
// (server/api/commander-decks/select.post.ts, tournament-round-results/
// upsert.post.ts, tournament-kills/*, tournament-votes/*) and the Telegram
// bot's real self-service flow (commands/tournaments/commanderReport.ts,
// 2026-09-24, replacing the old mockup). Each caller supplies its own
// authorization gate (requireManagementPermission for the organizer path,
// "is this player seated at this pairing" for the bot path) before calling.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Get-or-create the player's commander_decks row for this exact commander/
// partner combo (uq_commander_decks_single/uq_commander_decks_partner
// already enforce "one deck per player per combo"), then point this
// pairing's round result at it. Upserts the result row instead of a plain
// update — nothing pre-creates a placeholder tournament_round_results row
// when a pod pairing is made, so an update-only write silently no-ops if
// this is the player's first interaction with their pod this round.
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

// One seat's own placement. Unlike the organizer's whole-pod upsert
// (tournament-round-results/upsert.post.ts, which marks the pairing
// completed unconditionally once submitted), the bot writes one player at a
// time — the pairing only completes once every seat has a position, checked
// by maybeCompletePairing.
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

// Every real seat (player1..4uuid, however many are non-null) has a saved
// position — marks the pairing completed, same rule the organizer's own
// upsert endpoint applies unconditionally, just re-checked here since a
// self-service write only ever covers one seat.
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
}

// By the killer/killed pair rather than a uuid — the bot's own multiselect
// (mirroring the old mockup's killMask UX) toggles a kill on/off from a
// re-rendered button grid, never resolves/holds a row uuid client-side.
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

// Single-select per category — replaces any existing vote of this type by
// this voter for this pairing before inserting the new one, same rule as
// tournament-votes/create.post.ts.
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
