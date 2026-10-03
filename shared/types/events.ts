// shared\types\events.ts
import type { EventPartnerInput } from '#shared/utils/events/eventPartners'

// Shared by events/list/AddModal.vue and server/api/events/create.post.ts (thin pass-through to
// Supabase).
export interface NewEventPayload {
  name: string
  status: string
  locationUuid: string | null
  // Required, unlike tournaments.organizer_uuid: events.organizer_uuid is NOT NULL
  organizerUuid: string
  // No startsAt/endsAt: an event's dates are derived from its tournaments
  // (server/utils/derivedDates.ts)
  companionCode: string | null
  // What the event page shows beyond its tournaments (migration 20261003120000), all optional.
  tagline: string | null
  edition: number | null
  description: string | null
  practicalNotes: string | null
  ticketsUrl: string | null
  // "YYYY-MM-DD", the day tickets go on sale.
  ticketsOnSaleOn: string | null
  membershipRequired: boolean
  membershipUrl: string | null
  // The whole list: saving replaces the event's partners, array order = display order.
  partners: EventPartnerInput[]
  imageUrl: string | null
  // Scryfall art_crop attribution pair, same as tournaments/leagues
  imageCardName: string | null
  imageCardArtist: string | null
}
