// shared\types\locations.ts

// Shared by app/components/locations/list/AddModal.vue/EditModal.vue and
// server/api/locations/*.post.ts — same convention as
// shared/types/tournaments.ts (a thin pass-through to Supabase).

// Duplicated from app/types/index.d.ts's own OpeningHours rather than
// imported: shared/ code runs in both the client and server Nitro context,
// where the app's `~/types` alias isn't guaranteed to resolve the same way.
type SharedDayOfWeek
  = | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type SharedOpeningHours = Record<SharedDayOfWeek, { open: string, close: string } | null>

export interface NewLocationPayload {
  name: string
  address: string
  city: string
  province: string
  postalCode: string
  country: string
  phone: string | null
  email: string | null
  website: string | null
  googleMapsUrl: string | null
  openingHours: SharedOpeningHours | null
  image: string | null
  facebook: string | null
  instagram: string | null
  telegramChannel: string | null
  whatsapp: string | null
  temporarilyClosed: boolean
}
