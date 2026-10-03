// server\api\associates\apply.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { AssociateEditsPayload } from '#shared/types/associates'

// Public /tesseramento form endpoint: gated by requireUser (OTP-verified session), not
// requireManagementPermission, since the submitter is usually not staff. The OTP step proves
// control of a real inbox and acts as the anti-abuse gate instead of a captcha/rate limit.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const body = await readBody<AssociateEditsPayload>(event)
  if (body.email_address?.toLowerCase() !== user.email?.toLowerCase()) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Email non corrispondente alla sessione verificata'
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: existing } = await supabase
    .from('pauperwave_associates')
    .select('id')
    .eq('email_address', body.email_address)
    .maybeSingle()

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Esiste già una richiesta con questa email'
    })
  }

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('pauperwave_associates')
    .insert({
      ...body,
      membership_request_status: 'pending',
      request_date: now
    })
    .select()
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Richiesta di tesseramento fallita'
    })
  }

  await recordMembershipEvent(supabase, data.uuid, 'requested')

  await notifyTelegramAdmins(
    event,
    `📋 Nuova domanda di tesseramento: ${data.first_name} ${data.last_name}`
  )

  return { associate: data }
})
