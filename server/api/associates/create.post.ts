// server\api\associates\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { AssociateEditsPayload } from '#shared/types/associates'

// "Nuovo associato" (AddModal.vue): admin-only direct add, unlike the public apply.post.ts. Staff
// enters vetted data, so the row skips the requests queue and goes straight to 'approved'. Mirrors
// approve.post.ts's side effects (number assignment, membership events).
export default defineEventHandler(async (event) => {
  const user = await requireAdminPermission(event)

  const body = await readBody<AssociateEditsPayload>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: existing } = await supabase
    .from('pauperwave_associates')
    .select('id')
    .eq('email_address', body.email_address)
    .maybeSingle()

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Esiste già un associato con questa email'
    })
  }

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('pauperwave_associates')
    .insert({
      ...body,
      membership_request_status: 'approved',
      request_date: now,
      ...await auditColumnsForInsert(event, user)
    })
    .select()
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Creazione associato fallita'
    })
  }

  await recordMembershipEvent(supabase, data.uuid, 'requested')
  await recordMembershipEvent(supabase, data.uuid, 'approved')

  // Same "assign if missing" as approve.post.ts; always fires here since new rows have no number
  const { data: number, error: numberError } = await supabase.rpc(
    'next_pauperwave_associate_number'
  )
  if (!numberError && number) {
    await supabase
      .from('pauperwave_associates')
      .update({ pauperwave_associate_number: number })
      .eq('id', data.id)
    data.pauperwave_associate_number = number
  }

  return { associate: data }
})
