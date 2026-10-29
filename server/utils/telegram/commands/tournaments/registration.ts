// server\utils\telegram\commands\tournaments\registration.ts

// The register / cancel actions behind detail.ts's torneoMenu buttons and iscriviti.ts's buttons.
// They return an outcome instead of answering a callback, since each caller re-renders differently;
// a Supabase error still throws.

// Shop organizers (Magman etc.) are listed for visibility only: registration is their own business
export function isExternalOrganizer(row: { organizer: { type: string | null } | null }): boolean {
  return row.organizer?.type === 'shop'
}

export const TOURNAMENT_FULL_TEXT = 'Posti esauriti: il torneo ha raggiunto il numero massimo di iscritti.'

export async function registerForTournament(
  tournamentUuid: string, associateUuid: string
): Promise<'registered' | 'full'> {
  const supabase = telegramServiceSupabaseClient()
  if (await tournamentIsFull(supabase, tournamentUuid)) return 'full'

  const { error } = await supabase.rpc('register_tournament_players', {
    p_tournament_uuid: tournamentUuid,
    p_associate_uuids: [associateUuid]
  })
  if (error) throw error
  return 'registered'
}

export type CancelRegistrationOutcome = 'cancelled' | 'checked_in' | 'not_registered'

export const CANCEL_REFUSED_TEXT: Record<Exclude<CancelRegistrationOutcome, 'cancelled'>, string> = {
  checked_in: 'Non puoi annullare l\'iscrizione dopo il check-in.',
  not_registered: 'Non risulti iscritto a questo torneo.'
}

export async function cancelTournamentRegistration(
  tournamentUuid: string, associateUuid: string
): Promise<CancelRegistrationOutcome> {
  const supabase = telegramServiceSupabaseClient()
  const { data: existing, error: findError } = await supabase
    .from('tournament_registrations')
    .select('uuid, status, players!inner(associate_uuid)')
    .eq('tournament_uuid', tournamentUuid)
    .eq('players.associate_uuid', associateUuid)
    .maybeSingle()
  if (findError) throw findError

  if (existing?.status === 'checked_in') return 'checked_in'
  if (!existing || existing.status !== 'registered') return 'not_registered'

  const { error } = await supabase.from('tournament_registrations').delete().eq('uuid', existing.uuid)
  if (error) throw error
  return 'cancelled'
}
