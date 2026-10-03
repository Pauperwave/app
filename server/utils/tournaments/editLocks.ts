// server\utils\tournaments\editLocks.ts
// Write guards for tournament data:
// - registrations ("Accettazione") are frozen once round 1 starts, until a turn-back reopens them;
// - a round's data (results, kills, votes, commanders, drops, pairing resets) is writable only
//   while that
//   round is in progress, so a previous round or a finished tournament can't change. The UI hides
//   these actions too; this is what enforces it.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

type Client = SupabaseClient<Database>

const EDITABLE_REGISTRATION_STATUSES = ['draft', 'registration_open']

function locked(statusMessage: string): never {
  throw createError({ statusCode: 409, statusMessage })
}

function failIf(error: { message: string } | null) {
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

export async function assertRegistrationsEditable(supabase: Client, tournamentUuid: string) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('status')
    .eq('uuid', tournamentUuid)
    .maybeSingle()
  failIf(error)
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Torneo non trovato' })

  if (!EDITABLE_REGISTRATION_STATUSES.includes(data.status)) {
    locked('Le iscrizioni non sono più modificabili: il torneo è già iniziato. '
      + 'Torna alle iscrizioni per cambiarle.')
  }
}

// For endpoints that only receive registration uuids.
export async function assertRegistrationsEditableByUuids(
  supabase: Client,
  registrationUuids: string[]
) {
  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('tournament_uuid')
    .in('uuid', registrationUuids)
  failIf(error)

  for (const tournamentUuid of new Set((data ?? []).map(row => row.tournament_uuid))) {
    await assertRegistrationsEditable(supabase, tournamentUuid)
  }
}

export async function assertRoundEditable(supabase: Client, roundUuid: string) {
  const { data, error } = await supabase
    .from('tournament_rounds')
    .select('status')
    .eq('uuid', roundUuid)
    .maybeSingle()
  failIf(error)
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Round non trovato' })

  if (data.status !== 'in_progress') {
    locked('Questo round è chiuso e non è più modificabile.')
  }
}

export async function assertPairingEditable(supabase: Client, pairingUuid: string) {
  const { data, error } = await supabase
    .from('tournament_pairings')
    .select('round_uuid')
    .eq('uuid', pairingUuid)
    .maybeSingle()
  failIf(error)
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Tavolo non trovato' })

  await assertRoundEditable(supabase, data.round_uuid)
}

// For deletes that only receive a kill/vote uuid.
export async function assertPairingRowEditable(
  supabase: Client,
  table: 'tournament_kills' | 'tournament_votes',
  rowUuid: string
) {
  const { data, error } = await supabase
    .from(table)
    .select('pairing_uuid')
    .eq('uuid', rowUuid)
    .maybeSingle()
  failIf(error)
  if (!data) return

  await assertPairingEditable(supabase, data.pairing_uuid)
}
