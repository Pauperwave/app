// scripts\list-missing-geocodes.mjs
// Lists associates with no cached geocode row (pauperwave_associate_geocodes),
// and their address on file — useful to spot data-entry issues (typos,
// missing addresses) before/after running scripts/geocode-associates.mjs.
//
// Usage:
//   node scripts/list-missing-geocodes.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the environment (see .env).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const { data: associates, error: associatesError } = await supabase
  .from('pauperwave_associates')
  .select('uuid, first_name, last_name, residency_address, residency_house_number, residency_cap, residency_city, residency_province')

if (associatesError) throw associatesError

const { data: cached, error: cachedError } = await supabase
  .from('pauperwave_associate_geocodes')
  .select('associate_uuid')

if (cachedError) throw cachedError

const geocodedSet = new Set(cached.map(row => row.associate_uuid))
const missing = associates.filter(associate => !geocodedSet.has(associate.uuid))

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
