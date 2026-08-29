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

  const settings = await updatePauperwaveSettings(supabase, event, user, {
    membership_fee_amount: body.membershipFeeAmount,
    membership_fee_payment_method: body.membershipFeePaymentMethod
  })

  return { settings }
})
