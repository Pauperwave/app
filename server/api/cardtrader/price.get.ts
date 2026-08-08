// server\api\cardtrader\price.get.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// Lookup live per una stampa candidata, non ancora una wanted-card salvata —
// usato dal picker "Edizione" di AddModal.vue per mostrare il doppio prezzo
// prima ancora di aggiungere la richiesta. Nessun filtro lingua (il picker
// non conosce la lingua della stampa mostrata) né foil (il toggle "Foil" è
// un controllo separato nel form, non ancora noto qui) — anteprima
// indicativa, il prezzo preciso arriva con refresh-prices dopo il salvataggio.
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
