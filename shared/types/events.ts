// shared\types\events.ts
import type { EventPartnerInput } from '#shared/utils/events/eventPartners'

// Shared by app/components/events/list/AddModal.vue and
// server/api/events/create.post.ts — same convention as
// shared/types/tournaments.ts (a thin pass-through to Supabase).
export interface NewEventPayload {
  name: string
  status: string
  locationUuid: string | null
  // Required by the DB (events.organizer_uuid is NOT NULL, unlike
  // tournaments.organizer_uuid) — every event has an organizing club/group.
  organizerUuid: string
  // No startsAt/endsAt (2026-10-02): an event is a folder of tournaments, its dates are derived
  // from them (server/utils/derivedDates.ts).
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
  // Added 2026-08-22 alongside Card.vue/Cover.vue (issue #45) — events had
  // no way to set a cover image at all before (AddModal.vue never
  // collected one, `image` on the Event type stayed permanently null).
  imageUrl: string | null
  // Scryfall art_crop attribution pair, same as tournaments/leagues —
  // events had no image_card_name/image_card_artist columns until migration
  // 20260902195719 (user request: reuse the same attribution UI
  // tournaments already has).
  imageCardName: string | null
  imageCardArtist: string | null
}
