// server\api\settings\update-membership-fee.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { UpdateMembershipFeePayload } from '#shared/types/settings'
import { PAYMENT_METHODS } from '#shared/types/transactions'

export default defineEventHandler(async (event) => {
  const user = await requireAdminPermission(event)

  const body = await readBody<UpdateMembershipFeePayload>(event)

  if (!Number.isFinite(body.membershipFeeAmount) || body.membershipFeeAmount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Importo quota associativa non valido' })
  }
  if (!PAYMENT_METHODS.includes(body.membershipFeePaymentMethod)) {
    throw createError({ statusCode: 400, statusMessage: 'Metodo di pagamento non valido' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: settings, error } = await supabase
    .from('pauperwave_settings')
    .update({
      membership_fee_amount: body.membershipFeeAmount,
      membership_fee_payment_method: body.membershipFeePaymentMethod,
      ...await auditColumnsForUpdate(event, user)
    })
    .eq('id', 1)
    .select()
    .single()

  if (error || !settings) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Settings update failed'
    })
  }

  return { settings }
})
