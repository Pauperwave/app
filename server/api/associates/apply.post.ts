// server\api\associates\apply.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface ApplyBody {
  associate_type: 'regular' | 'sustaining'
  first_name: string
  last_name: string
  email_address: string
  phone_number: string
  tax_code: string
  born_location: string
  born_date: string
  born_province: string
  born_state: string
  residency_address: string
  residency_house_number: string | null
  residency_city: string
  residency_province: string
  residency_cap: string
  mtgo_nickname: string | null
  mtga_nickname: string | null
  consent_data: boolean
  consent_social: boolean
  has_read_statute: boolean
}

// The /tesseramento public form's BFF endpoint — gated by requireUser (a valid
// OTP-verified Supabase session), not requireManagementPermission: the whole
// point is that the submitter is NOT staff, often not even an existing
// associate yet. The OTP step (see /tesseramento's "email"/"verifica" steps)
// is the anti-abuse gate in place of a captcha/rate-limit, since it already
// proves control of a real inbox before this endpoint is ever reachable.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const body = await readBody<ApplyBody>(event)
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

  return { associate: data }
})
