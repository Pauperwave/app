// server\utils\telegram\commands\cards\wantedLookup.ts
import { findWantedMatch, type WantedCardChoice } from '#shared/utils/wantedCards/wantedCardRow'

type ServiceClient = ReturnType<typeof telegramServiceSupabaseClient>

// The associate's own active row (still searching, not trashed) for this printing, language and
// finish, or null when the card isn't among their wanted ones
export async function findActiveWantedCard(
  supabase: ServiceClient,
  associateUuid: string,
  scryfallId: string,
  choice: Pick<WantedCardChoice, 'language' | 'foil'>
): Promise<{ id: number } | null> {
  const { data, error } = await supabase
    .from('pauperwave_wanted_cards')
    .select('id, language, treatment')
    .eq('player_associate_uuid', associateUuid)
    .eq('scryfall_id', scryfallId)
    .eq('status', 'searching')
    .is('deleted_at', null)
  if (error) throw error

  const match = findWantedMatch(data ?? [], choice)
  return match ? { id: match.id } : null
}
