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
}
