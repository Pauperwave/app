// server\api\tournament-registrations\delete.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface DeleteBody {
  tournamentUuid: string
  registrationUuids: string[]
}

// Hard delete of the registration (no deleted_at column, and a removed one shouldn't reappear), but
// also soft-deletes the associate's "Tournament Fee" payment for this tournament, so "Rimuovi" on a
// paid player doesn't leave a payment for a tournament they're no longer in.
export default defineEventHandler(async (event) => {
  const user = await requireManagementPermission(event)

  const { tournamentUuid, registrationUuids } = await readBody<DeleteBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  await assertRegistrationsEditable(supabase, tournamentUuid)

  const { data: registrations, error: readError } = await supabase
    .from('tournament_registrations')
    .select('players(associate_uuid)')
    .in('uuid', registrationUuids)

  if (readError) {
    throw createError({ statusCode: 500, statusMessage: readError.message })
  }

  const { error: deleteError } = await supabase
    .from('tournament_registrations')
    .delete()
    .in('uuid', registrationUuids)

  if (deleteError) {
    throw createError({ statusCode: 500, statusMessage: deleteError.message })
  }

  const associateUuids = (registrations ?? [])
    .map(registration => registration.players?.associate_uuid)
    .filter((associateUuid): associateUuid is string => !!associateUuid)

  if (associateUuids.length) {
    const { error: paymentsError } = await supabase
      .from('pauperwave_payments')
      .update({ ...await auditColumnsForUpdate(event, user), deleted_at: new Date().toISOString() })
      .eq('tournament_uuid', tournamentUuid)
      .eq('payment_type', 'Tournament Fee')
      .in('associate_uuid', associateUuids)
      .is('deleted_at', null)

    if (paymentsError) {
      throw createError({ statusCode: 500, statusMessage: paymentsError.message })
    }
  }

  return { success: true }
})
