// server\api\cardtrader\resolve.get.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

export default defineEventHandler(async (event) => {
  await requireUser(event)

  const { scryfallId, setCode } = getQuery<{ scryfallId?: string, setCode?: string }>(event)
  if (!scryfallId || !setCode) {
    throw createError({ statusCode: 400, statusMessage: 'scryfallId e setCode sono richiesti' })
  }

  const token = useRuntimeConfig(event).cardTraderApiToken
  if (!token) {
    throw createError({ statusCode: 500, statusMessage: 'CardTrader API token non configurato' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  return resolveCardTraderBlueprint(supabase, token, scryfallId, setCode)
})
