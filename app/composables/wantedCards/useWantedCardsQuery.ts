// app\composables\wantedCards\useWantedCardsQuery.ts
import type { WantedCard, WantedCardStatus } from '~/types'

export const WANTED_CARDS_KEY = ['wanted-cards']

export function useWantedCardsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: WANTED_CARDS_KEY,
    query: async (): Promise<WantedCard[]> => {
      const { data, error } = await supabase
        .from('pauperwave_wanted_cards')
        // Explicit hint on the FK column: since created_by/updated_by also
        // reference pauperwave_associates, PostgREST can no longer work out on its
        // own which of the three relations "associate" means.
        .select('*, associate:pauperwave_associates!player_associate_uuid(first_name, last_name)')
        .is('deleted_at', null)
        // `id` as a tiebreaker: without a fully deterministic ORDER BY, rows
        // with an equal (or null) requested_at have no guaranteed order across
        // query executions — an UPDATE (e.g. "Aggiorna prezzi", which only
        // touches price columns, not requested_at) can physically relocate a
        // row and visibly reshuffle the grid on refetch even though nothing
        // about the request's own timing changed. Found 2026-08-15.
        .order('requested_at', { ascending: false })
        .order('id', { ascending: true })

      if (error) throw error

      // The DB's snake_case columns mapped onto the existing camelCase WantedCard
      // interface (which grew out of the mock data) — avoids rewriting the whole UI
      // (table columns, grid, filters) around the real column names. Nulls become
      // the defaults the existing code already uses for optional fields (empty
      // string, 0 for cmc).
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
        language: row.language ?? '',
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
        playerAssociateUuid: row.player_associate_uuid
      }))
    }
  })
}
