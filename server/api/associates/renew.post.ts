// server\api\associates\renew.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// The /tesseramento renewal step's confirm action — flips an already-
// approved associate's own row back to 'pending' rather than inserting a new
// pauperwave_associates row (that's what apply.post.ts is for). Reusing the
// same membership_request_status pipeline means a renewal shows up in
// /associates/requests exactly like a new application, and staff tells the
// two apart the same way they already do elsewhere: the row's own
// "Ultimo rinnovo" column is populated for a returning member, empty for a
// first-time one (user request, 2026-08-27).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (!user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Email non presente nella sessione' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)

  // request_date is NOT touched here — it pins the moment the person first
  // ever requested tesseramento, and staff relies on it staying put to tell
  // a renewal (old request_date, populated "Ultimo rinnovo") apart from a
  // genuinely new application (fresh request_date, empty "Ultimo rinnovo")
  // in /associates/requests (user request, 2026-08-27). Only the status
  // flips; updated_at still moves via the table's own trigger.
  const { data, error } = await supabase
    .from('pauperwave_associates')
    .update({ membership_request_status: 'pending' })
    .eq('email_address', user.email)
    .eq('membership_request_status', 'approved')
    .select()
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Nessun tesseramento approvato trovato per questa email'
    })
  }

  return { associate: data }
})
