// server\api\cardtrader\price.get.ts
// Live lookup for a candidate printing, not yet a saved wanted card — used by
// AddModal.vue's "Edition" picker to show both prices before the request is even
// added. No language filter (the picker does not know the displayed printing's
// language) and no foil filter (the "Foil" toggle is a separate control in the
// form, not known here yet) — an indicative preview; the precise price arrives via
// refresh-prices after saving.
export default defineEventHandler(async (event) => {
  const {
    scryfallId, setCode, token, supabase
  } = await resolveCardTraderRequestContext(event)
  if (!token) return { price: null }

  const price = await fetchCardtraderPriceForPrinting(
    supabase, token, scryfallId, setCode, false, null
  )

  return { price }
})
