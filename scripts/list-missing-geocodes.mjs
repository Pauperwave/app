// scripts\list-missing-geocodes.mjs
// Lists associates with no cached geocode row and their address on file, to spot typos or missing
// addresses around scripts/geocode-associates.mjs.
//
// Usage:
//   node scripts/list-missing-geocodes.mjs

import { createSupabaseAdminClient } from './lib/supabaseAdminClient.mjs'
import { fetchAssociatesAndGeocodedUuids } from './lib/associateGeocodeQueries.mjs'

const supabase = createSupabaseAdminClient()

const { associates, geocodedUuids } = await fetchAssociatesAndGeocodedUuids(supabase)
const missing = associates.filter(associate => !geocodedUuids.has(associate.uuid))

for (const associate of missing) {
  const address = [
    associate.residency_address,
    associate.residency_house_number,
    associate.residency_cap,
    associate.residency_city,
    associate.residency_province
  ].filter(Boolean).join(', ')

  console.log(`${associate.first_name} ${associate.last_name}: ${address || '(nessun indirizzo su file)'}`)
}

console.log(`\nTotale: ${missing.length}`)
