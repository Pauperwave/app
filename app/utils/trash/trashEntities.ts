// app\utils\trash\trashEntities.ts
import type { TrashEntity } from '~/types'
import type { IconName } from '~/utils/icons'

// Client-side mirror of server/utils/idRequest.ts's SoftDeletableTable union
// — keep both in sync when a new domain gains soft delete. Table names are
// sent to server/api/trash/restore.post.ts, which re-validates them against
// its own whitelist rather than trusting this mapping.
export const TRASH_ENTITY_TABLES: Record<TrashEntity, string> = {
  tournament: 'tournaments',
  league: 'leagues',
  event: 'events',
  transaction: 'pauperwave_payments',
  wantedCard: 'pauperwave_wanted_cards',
  mtgFormat: 'mtg_formats',
  location: 'locations'
}

export const TRASH_ENTITY_ICONS: Record<TrashEntity, IconName> = {
  tournament: ICONS.battle,
  league: ICONS.standings,
  event: ICONS.calendar,
  transaction: ICONS.wallet,
  wantedCard: ICONS.cardSearch,
  mtgFormat: ICONS.rules,
  location: ICONS.mapPin
}
