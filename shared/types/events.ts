// shared\types\events.ts

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
  startsAt: string
  endsAt: string | null
  companionCode: string | null
  // Added 2026-08-22 alongside Card.vue/Cover.vue (issue #45) — events had
  // no way to set a cover image at all before (AddModal.vue never
  // collected one, `image` on the Event type stayed permanently null). No
  // Scryfall art_crop attribution pair (unlike tournaments/leagues): the
  // `events` table has no image_card_name/image_card_artist columns.
  imageUrl: string | null
}
