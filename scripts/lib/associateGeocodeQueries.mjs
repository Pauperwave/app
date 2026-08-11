// scripts\lib\associateGeocodeQueries.mjs
// Shared by geocode-associates.mjs and list-missing-geocodes.mjs: both need
// every associate's residency fields plus the set of already-geocoded uuids.
export async function fetchAssociatesAndGeocodedUuids(supabase) {
  const { data: associates, error: associatesError } = await supabase
    .from('pauperwave_associates')
    .select('uuid, first_name, last_name, residency_address, residency_house_number, residency_cap, residency_city, residency_province')

  if (associatesError) throw associatesError

  const { data: cached, error: cachedError } = await supabase
    .from('pauperwave_associate_geocodes')
    .select('associate_uuid')

  if (cachedError) throw cachedError

  return { associates, geocodedUuids: new Set(cached.map(row => row.associate_uuid)) }
}
