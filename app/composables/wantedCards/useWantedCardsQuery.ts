// app\composables\wantedCards\useWantedCardsQuery.ts
import type { WantedCard, WantedCardStatus } from '~/types'
import type { WantedCardLanguage } from '~/utils/wantedCards/wantedCardLanguages'

export const WANTED_CARDS_KEY = ['wanted-cards']

export function useWantedCardsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: WANTED_CARDS_KEY,
    query: async (): Promise<WantedCard[]> => {
      const { data, error } = await supabase
        .from('pauperwave_wanted_cards')
        // Explicit hint on the FK column: created_by/updated_by also reference
        // pauperwave_associates, so PostgREST can't tell which of the three relations "associate"
        // means
        .select(`*,
          associate:pauperwave_associates!player_associate_uuid(first_name, last_name),
          created_by_associate:pauperwave_associates!created_by(first_name, last_name),
          updated_by_associate:pauperwave_associates!updated_by(first_name, last_name)`)
        .is('deleted_at', null)
        // `id` as a tiebreaker: without a deterministic ORDER BY, rows with an equal (or null)
        // requested_at have no guaranteed order, and an UPDATE (e.g. "Aggiorna prezzi") can
        // physically relocate a row and reshuffle the grid on refetch
        .order('requested_at', { ascending: false })
        .order('id', { ascending: true })

      if (error) throw error

      // The DB's snake_case columns mapped onto the existing camelCase WantedCard interface (which
      // grew from the mock data), avoiding a rewrite of the table, grid and filters. Nulls become
      // the defaults the existing code uses for optional fields (empty string, 0 for cmc)
      return (data ?? []).map((row): WantedCard => ({
        id: row.id,
        date: row.requested_at ?? '',
        status: row.status as WantedCardStatus,
        foundAt: row.found_at,
        cardName: row.card_name,
        scryfallUrl: row.scryfall_url ?? '',
        scryfallId: row.scryfall_id,
        setCode: row.set_code,
        copies: row.copies,
        language: (row.language ?? '') as WantedCardLanguage | '',
        treatment: row.treatment,
        manaCost: row.mana_cost ?? '',
        colorIdentity: row.color_identity,
        typeLine: row.type_line,
        cmc: row.cmc ?? 0,
        imageUrl: row.image_url ?? '',
        cardmarketPrice: row.cardmarket_price,
        cardmarketPriceSyncedAt: row.cardmarket_price_synced_at,
        cardtraderPrice: row.cardtrader_price,
        cardtraderPriceSyncedAt: row.cardtrader_price_synced_at,
        notes: row.notes ?? '',
        player: row.associate ? `${row.associate.first_name} ${row.associate.last_name}` : '',
        playerAssociateUuid: row.player_associate_uuid,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by_associate ? `${row.created_by_associate.first_name} ${row.created_by_associate.last_name}` : '',
        updatedBy: row.updated_by_associate ? `${row.updated_by_associate.first_name} ${row.updated_by_associate.last_name}` : ''
      }))
    }
  })
}
