// app\composables\locations\useLocationsQuery.ts
// Reused across every domain's AddModal that needs to pick a venue
// (tournaments today, events/leagues once those migrate too) — same
// reasoning as useOrganizationsQuery.ts/useMtgFormatsQuery.ts. Also backs
// the /locations management page (2026-08-16), hence the full mapped
// Location[] rather than a lookup-only subset.
import type { Location } from '~/types'

export const LOCATIONS_KEY = ['locations']

export function useLocationsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: LOCATIONS_KEY,
    query: async (): Promise<Location[]> => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) throw error

      return data.map(row => ({
        id: row.id,
        uuid: row.uuid,
        name: row.name,
        address: row.address,
        city: row.city,
        province: row.province,
        postalCode: row.postal_code,
        country: row.country,
        phone: row.phone,
        email: row.email,
        website: row.website,
        googleMapsUrl: row.google_maps_url,
        openingHours: row.opening_hours as Location['openingHours'],
        image: row.image_url,
        facebook: row.facebook_url,
        instagram: row.instagram_url,
        telegramChannel: row.telegram_url,
        whatsapp: row.whatsapp_url,
        temporarilyClosed: row.temporarily_closed
      }))
    }
  })
}
