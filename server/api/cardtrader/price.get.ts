// server\api\cardtrader\price.get.ts
// Live lookup for a candidate printing not yet saved as a wanted card (AddModal.vue's "Edition"
// picker). No language or foil filter, as the form doesn't know them yet: an indicative preview,
// the precise price arrives via refresh-prices after saving.
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
