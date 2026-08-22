// app\composables\trash\useTrashQuery.ts
import type { TrashEntity, TrashItem } from '~/types'

export const TRASH_KEY = ['trash']

function toTrashItem(
  entity: TrashEntity, id: number, uuid: string, name: string, deletedAt: string | null
): TrashItem {
  return { entity, id, uuid, name, deletedAt: deletedAt! }
}

// One read per soft-deletable table (server/utils/idRequest.ts's
// SoftDeletableTable union), run in parallel and merged into a single list —
// same "combine several Supabase reads into one derived shape" pattern as
// useEventsQuery.ts's events+tournaments join. pauperwave_payments has no
// single "name" column, so its label falls back through payer name -> event
// name -> a bare id, same fallback order the receipts flow already uses.
export function useTrashQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: TRASH_KEY,
    query: async (): Promise<TrashItem[]> => {
      const [
        tournaments, leagues, events, transactions, wantedCards, mtgFormats
      ] = await Promise.all([
        supabase.from('tournaments').select('id, uuid, name, deleted_at').not('deleted_at', 'is', null),
        supabase.from('leagues').select('id, uuid, name, deleted_at').not('deleted_at', 'is', null),
        supabase.from('events').select('id, uuid, name, deleted_at').not('deleted_at', 'is', null),
        supabase
          .from('pauperwave_payments')
          .select('id, uuid, payer_name, payer_surname, event_name, deleted_at')
          .not('deleted_at', 'is', null),
        supabase.from('pauperwave_wanted_cards').select('id, uuid, card_name, deleted_at').not('deleted_at', 'is', null),
        supabase.from('mtg_formats').select('id, uuid, name, deleted_at').not('deleted_at', 'is', null)
      ])

      for (const result of [tournaments, leagues, events, transactions, wantedCards, mtgFormats]) {
        if (result.error) throw result.error
      }

      const items: TrashItem[] = [
        ...tournaments.data!.map(row => toTrashItem('tournament', row.id, row.uuid, row.name, row.deleted_at)),
        ...leagues.data!.map(row => toTrashItem('league', row.id, row.uuid, row.name, row.deleted_at)),
        ...events.data!.map(row => toTrashItem('event', row.id, row.uuid, row.name, row.deleted_at)),
        ...transactions.data!.map(row => toTrashItem(
          'transaction',
          row.id,
          row.uuid,
          [row.payer_name, row.payer_surname].filter(Boolean).join(' ') || row.event_name || `#${row.id}`,
          row.deleted_at
        )),
        ...wantedCards.data!.map(row => toTrashItem('wantedCard', row.id, row.uuid, row.card_name, row.deleted_at)),
        ...mtgFormats.data!.map(row => toTrashItem('mtgFormat', row.id, row.uuid, row.name, row.deleted_at))
      ]

      return items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
    }
  })
}
