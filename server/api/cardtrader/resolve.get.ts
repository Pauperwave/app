// server\api\cardtrader\resolve.get.ts
export default defineEventHandler(async (event) => {
  const {
    scryfallId, setCode, token, supabase
  } = await resolveCardTraderRequestContext(event)

  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'CardTrader API token non configurato'
    })
  }

  return resolveCardTraderBlueprint(supabase, token, scryfallId, setCode)
})
