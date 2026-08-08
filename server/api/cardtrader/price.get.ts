// server\api\cardtrader\price.get.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// Live lookup for a candidate printing, not yet a saved wanted card — used by
// AddModal.vue's "Edition" picker to show both prices before the request is even
// added. No language filter (the picker does not know the displayed printing's
// language) and no foil filter (the "Foil" toggle is a separate control in the
// form, not known here yet) — an indicative preview; the precise price arrives via
// refresh-prices after saving.
export default defineEventHandler(async (event) => {
  await requireUser(event)

  const { scryfallId, setCode } = getQuery<{ scryfallId?: string, setCode?: string }>(event)
  if (!scryfallId || !setCode) {
    throw createError({ statusCode: 400, statusMessage: 'scryfallId e setCode sono richiesti' })
  }

  const token = useRuntimeConfig(event).cardTraderApiToken
  if (!token) return { price: null }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const price = await fetchCardtraderPriceForPrinting(
    supabase, token, scryfallId, setCode, false, null
  )

  return { price }
})
