// shared\types\locations.ts

// Shared by locations/list/AddModal.vue/EditModal.vue and server/api/locations/*.post.ts (thin
// pass-through to Supabase).

// Duplicated from app/types/index.d.ts's OpeningHours: the `~/types` alias isn't guaranteed to
// resolve in shared/
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
