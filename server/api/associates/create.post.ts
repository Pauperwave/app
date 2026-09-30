// server\api\associates\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { AssociateEditsPayload } from '#shared/types/associates'

// "Nuovo associato" (AddModal.vue) — admin-only direct add, unlike apply.post.ts
// (the public /tesseramento form, requireUser + self-email check only). Here
// staff is entering someone else's data directly, so the row goes straight to
// membership_request_status 'approved' instead of landing in Associati >
// Richieste — skipping a redundant self-approval step for a member staff
// already vetted by hand. Mirrors approve.post.ts's own side effects (number
// assignment, membership events) so a direct add ends up indistinguishable
// from apply + approve.
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

  // Same "assign if missing" as approve.post.ts — every new row is missing
  // one, so this always fires here.
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
