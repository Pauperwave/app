// server\api\tournament-registrations\status.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

type RegistrationStatus = 'registered' | 'checked_in' | 'no_show'

interface StatusBody {
  registrationUuids: string[]
  status: RegistrationStatus
}

// Batch, not one request per row: one write instead of N, like AcceptancePicker.vue's local state
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { registrationUuids, status } = await readBody<StatusBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  await assertRegistrationsEditableByUuids(supabase, registrationUuids)

  // Only a real transition to 'checked_in' is announced: re-sending the same batch must not message
  // twice
  const { data: previous, error: previousError } = await supabase
    .from('tournament_registrations')
    .select('uuid, status')
    .in('uuid', registrationUuids)

  if (previousError) {
    throw createError({ statusCode: 500, statusMessage: previousError.message })
  }

  const { data, error } = await supabase
    .from('tournament_registrations')
    .update({
      status,
      // Only 'checked_in' has a timestamp: other statuses clear a stale check-in time
      checked_in_at: status === 'checked_in' ? new Date().toISOString() : null
    })
    .in('uuid', registrationUuids)
    .select('uuid, status, created_at, checked_in_at, player_uuid')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  if (status === 'checked_in') {
    const alreadyAccepted = new Set(
      (previous ?? []).filter(registration => registration.status === 'checked_in').map(registration => registration.uuid)
    )
    const newlyAcceptedUuids = (data ?? [])
      .filter(registration => !alreadyAccepted.has(registration.uuid))
      .map(registration => registration.uuid)

    await notifyRegistrationsAccepted(newlyAcceptedUuids)
  }

  return { registrations: data ?? [] }
})
