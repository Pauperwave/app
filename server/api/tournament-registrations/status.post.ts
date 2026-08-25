// server\api\tournament-registrations\status.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

type RegistrationStatus = 'registered' | 'checked_in' | 'no_show'

interface StatusBody {
  registrationUuids: string[]
  status: RegistrationStatus
}

// Batch, not one request per row — same "one write, not N" reasoning as
// AcceptancePicker.vue's own removeAcceptedItems/transferToAccepted, just at
// the network layer instead of a single component's local state.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { registrationUuids, status } = await readBody<StatusBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('tournament_registrations')
    .update({
      status,
      // Only 'checked_in' has a meaningful timestamp — reverting to
      // 'registered' or marking 'no_show' clears it rather than leaving a
      // stale check-in time from a previous, now-undone acceptance.
      checked_in_at: status === 'checked_in' ? new Date().toISOString() : null
    })
    .in('uuid', registrationUuids)
    .select('uuid, status, created_at, checked_in_at, player_uuid')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { registrations: data ?? [] }
})
