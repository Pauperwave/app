// app\composables\useWantedCardsQuery.ts
import type { WantedCard, WantedCardStatus } from '~/types'

export const WANTED_CARDS_KEY = ['wanted-cards']

export function useWantedCardsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: WANTED_CARDS_KEY,
    query: async (): Promise<WantedCard[]> => {
      const { data, error } = await supabase
        .from('pauperwave_wanted_cards')
        .select('*, associate:pauperwave_associates(first_name, last_name)')
        .order('requested_at', { ascending: false })

      if (error) throw error

      // Colonne snake_case del DB mappate sull'interfaccia camelCase
      // WantedCard esistente (nata dai dati mock) — evita di riscrivere
      // tutta la UI (colonne tabella, griglia, filtri) attorno ai nomi
      // colonna reali. I null diventano i default già usati dal codice
      // esistente per i campi opzionali (stringa vuota, 0 per cmc).
      return (data ?? []).map((row): WantedCard => ({
        id: row.id,
        date: row.requested_at ?? '',
        status: row.status as WantedCardStatus,
        foundAt: row.found_at,
        cardName: row.card_name,
        scryfallUrl: row.scryfall_url ?? '',
        copies: row.copies,
        language: row.language ?? '',
        treatment: row.treatment,
        manaCost: row.mana_cost ?? '',
        colorIdentity: row.color_identity,
        cmc: row.cmc ?? 0,
        imageUrl: row.image_url ?? '',
        price: row.price,
        notes: row.notes ?? '',
        player: row.associate ? `${row.associate.first_name} ${row.associate.last_name}` : '',
        playerAssociateUuid: row.player_associate_uuid
      }))
    }
  })
}
