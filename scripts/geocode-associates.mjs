// scripts\geocode-associates.mjs
// One-off batch job: geocodes every associate's residency address and caches
// the result in pauperwave_associate_geocodes. Re-run any time to fill in
// associates added since the last run — already-geocoded associates are
// skipped.
//
// Tries multiple free, no-API-key providers/query variants in order, from
// most to least precise, since Nominatim often misses Italian frazioni/
// località names or exact house numbers:
//   1. Nominatim, full address, restricted to Italy
//   2. Nominatim, full address, unrestricted (handles associates actually
//      residing abroad)
//   3. Nominatim, address without house number, restricted to Italy
//   4. Nominatim, city + province only, restricted to Italy (coarse fallback)
//   5. Photon (Komoot), full address (different OSM index, sometimes matches
//      where Nominatim doesn't)
//
// Nominatim usage policy requires max 1 request/sec and a real User-Agent
// identifying the app: https://operations.osmfoundation.org/policies/nominatim/
// Photon has no published rate limit but is used politely (same delay).
//
// Usage:
//   node scripts/geocode-associates.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the environment (see .env).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const PHOTON_URL = 'https://photon.komoot.io/api/'
const USER_AGENT = 'PauperWave-app/1.0 (associate residency map; contact: emanuelenardi.dev@gmail.com)'
const REQUEST_DELAY_MS = 1100

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function geocodeViaNominatim(query, { restrictToItaly = true } = {}) {
  const params = { q: query, format: 'jsonv2', limit: '1' }
  if (restrictToItaly) params.countrycodes = 'it'

  const response = await fetch(`${NOMINATIM_URL}?${new URLSearchParams(params)}`, {
    headers: { 'User-Agent': USER_AGENT }
  })
  if (!response.ok) {
    throw new Error(`Nominatim request failed: ${response.status} ${response.statusText}`)
  }

  const [match] = await response.json()
  return match ? { latitude: Number(match.lat), longitude: Number(match.lon) } : null
}

async function geocodeViaPhoton(query) {
  const response = await fetch(`${PHOTON_URL}?${new URLSearchParams({ q: query, limit: '1' })}`, {
    headers: { 'User-Agent': USER_AGENT }
  })
  if (!response.ok) {
    throw new Error(`Photon request failed: ${response.status} ${response.statusText}`)
  }

  const { features } = await response.json()
  const [match] = features ?? []
  return match ? { latitude: match.geometry.coordinates[1], longitude: match.geometry.coordinates[0] } : null
}

// Each attempt is {provider, query}; tried in order until one finds a match.
function buildAttempts(associate) {
  const { residency_address, residency_house_number, residency_cap, residency_city, residency_province } = associate

  const fullAddress = [residency_address, residency_house_number, residency_cap, residency_city, residency_province].filter(Boolean).join(', ')
  const withoutHouseNumber = [residency_address, residency_cap, residency_city, residency_province].filter(Boolean).join(', ')
  const cityOnly = [residency_city, residency_province, 'Italia'].filter(Boolean).join(', ')

  const attempts = []
  if (fullAddress) {
    attempts.push({ provider: 'nominatim', query: fullAddress, restrictToItaly: true })
    attempts.push({ provider: 'nominatim', query: fullAddress, restrictToItaly: false })
  }
  if (withoutHouseNumber && withoutHouseNumber !== fullAddress) {
    attempts.push({ provider: 'nominatim', query: withoutHouseNumber, restrictToItaly: true })
  }
  if (residency_city) {
    attempts.push({ provider: 'nominatim', query: cityOnly, restrictToItaly: true })
  }
  if (fullAddress) {
    attempts.push({ provider: 'photon', query: fullAddress })
  }

  return attempts
}

async function main() {
  const { data: associates, error: associatesError } = await supabase
    .from('pauperwave_associates')
    .select('uuid, first_name, last_name, residency_address, residency_house_number, residency_cap, residency_city, residency_province')

  if (associatesError) throw associatesError

  const { data: cached, error: cachedError } = await supabase
    .from('pauperwave_associate_geocodes')
    .select('associate_uuid')

  if (cachedError) throw cachedError

  const alreadyGeocoded = new Set(cached.map(row => row.associate_uuid))
  const pending = associates.filter(associate => !alreadyGeocoded.has(associate.uuid))

  console.log(`${pending.length} associate(s) to geocode (${alreadyGeocoded.size} already cached).`)

  let geocoded = 0
  let skipped = 0

  for (const associate of pending) {
    const attempts = buildAttempts(associate)

    if (!attempts.length) {
      console.warn(`Skipping ${associate.first_name} ${associate.last_name}: no residency address on file.`)
      skipped++
      continue
    }

    let result = null
    let matchedQuery = null

    for (const attempt of attempts) {
      try {
        result = attempt.provider === 'photon'
          ? await geocodeViaPhoton(attempt.query)
          : await geocodeViaNominatim(attempt.query, { restrictToItaly: attempt.restrictToItaly })
      } catch (err) {
        console.error(`Error geocoding ${associate.first_name} ${associate.last_name} via ${attempt.provider}:`, err.message)
      }

      await sleep(REQUEST_DELAY_MS)

      if (result) {
        matchedQuery = attempt
        break
      }
    }

    if (!result) {
      console.warn(`No geocoding match for ${associate.first_name} ${associate.last_name} ("${attempts[0].query}"), tried ${attempts.length} variant(s).`)
      skipped++
      continue
    }

    const { error: upsertError } = await supabase
      .from('pauperwave_associate_geocodes')
      .upsert({
        associate_uuid: associate.uuid,
        latitude: result.latitude,
        longitude: result.longitude
      })

    if (upsertError) throw upsertError

    geocoded++
    console.log(`Geocoded ${associate.first_name} ${associate.last_name} via ${matchedQuery.provider} ("${matchedQuery.query}"): ${result.latitude}, ${result.longitude}`)
  }

  console.log(`Done. Geocoded ${geocoded}, skipped ${skipped}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
