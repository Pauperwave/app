// app\composables\trash\useTrashQuery.ts
import type { TrashEntity, TrashItem } from '~/types'

export const TRASH_KEY = ['trash']

// `deletedBy` mirrors Transaction's own createdBy/updatedBy resolution
// (useTransactionsQuery.ts) — '' when unknown (soft-deleted before the
// deleted_by column existed, migration 20260823110000) rather than null,
// same convention.
type AssociateNameRow = { first_name: string, last_name: string } | null

function toTrashItem(
  entity: TrashEntity, id: number, uuid: string, name: string,
  deletedAt: string | null, deletedByUuid: string | null, deletedByAssociate: AssociateNameRow
): TrashItem {
  return {
    entity,
    id,
    uuid,
    name,
    deletedAt: deletedAt!,
    deletedBy: deletedByAssociate ? `${deletedByAssociate.first_name} ${deletedByAssociate.last_name}` : '',
    deletedByUuid
  }
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
        tournaments, leagues, events, transactions, wantedCards, mtgFormats, locations
      ] = await Promise.all([
        supabase
          .from('tournaments')
          .select('id, uuid, name, deleted_at, deleted_by, deleted_by_associate:pauperwave_associates!deleted_by(first_name, last_name)')
          .not('deleted_at', 'is', null),
        supabase
          .from('leagues')
          .select('id, uuid, name, deleted_at, deleted_by, deleted_by_associate:pauperwave_associates!deleted_by(first_name, last_name)')
          .not('deleted_at', 'is', null),
        supabase
          .from('events')
          .select('id, uuid, name, deleted_at, deleted_by, deleted_by_associate:pauperwave_associates!deleted_by(first_name, last_name)')
          .not('deleted_at', 'is', null),
        supabase
          .from('pauperwave_payments')
          .select(`
            id, uuid, payer_name, payer_surname, event_name, deleted_at, deleted_by,
            deleted_by_associate:pauperwave_associates!deleted_by(first_name, last_name)
          `)
          .not('deleted_at', 'is', null),
        supabase
          .from('pauperwave_wanted_cards')
          .select('id, uuid, card_name, deleted_at, deleted_by, deleted_by_associate:pauperwave_associates!deleted_by(first_name, last_name)')
          .not('deleted_at', 'is', null),
        supabase
          .from('mtg_formats')
          .select('id, uuid, name, deleted_at, deleted_by, deleted_by_associate:pauperwave_associates!deleted_by(first_name, last_name)')
          .not('deleted_at', 'is', null),
        supabase
          .from('locations')
          .select('id, uuid, name, deleted_at, deleted_by, deleted_by_associate:pauperwave_associates!deleted_by(first_name, last_name)')
          .not('deleted_at', 'is', null)
      ])

      const results = [
        tournaments, leagues, events, transactions, wantedCards, mtgFormats, locations
      ]
      for (const result of results) {
        if (result.error) throw result.error
      }

      const items: TrashItem[] = [
        ...tournaments.data!.map(row => toTrashItem(
          'tournament', row.id, row.uuid, row.name, row.deleted_at, row.deleted_by, row.deleted_by_associate
        )),
        ...leagues.data!.map(row => toTrashItem(
          'league', row.id, row.uuid, row.name, row.deleted_at, row.deleted_by, row.deleted_by_associate
        )),
        ...events.data!.map(row => toTrashItem(
          'event', row.id, row.uuid, row.name, row.deleted_at, row.deleted_by, row.deleted_by_associate
        )),
        ...transactions.data!.map(row => toTrashItem(
          'transaction',
          row.id,
          row.uuid,
          [row.payer_name, row.payer_surname].filter(Boolean).join(' ') || row.event_name || `#${row.id}`,
          row.deleted_at,
          row.deleted_by,
          row.deleted_by_associate
        )),
        ...wantedCards.data!.map(row => toTrashItem(
          'wantedCard', row.id, row.uuid, row.card_name, row.deleted_at, row.deleted_by, row.deleted_by_associate
        )),
        ...mtgFormats.data!.map(row => toTrashItem(
          'mtgFormat', row.id, row.uuid, row.name, row.deleted_at, row.deleted_by, row.deleted_by_associate
        )),
        ...locations.data!.map(row => toTrashItem(
          'location', row.id, row.uuid, row.name, row.deleted_at, row.deleted_by, row.deleted_by_associate
        ))
      ]

      return items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
    }
  })
}
