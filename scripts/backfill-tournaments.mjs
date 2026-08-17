// scripts\backfill-tournaments.mjs
// One-off batch job: insert a batch of tournaments for a league in one shot
// (used 2026-08-16 to backfill Lega Invernale 2026's 5 "tappa" tournaments,
// then Lega Estiva 2025's 6). Edit LEAGUE_UUID/FORMAT_UUID/LOCATION_UUID/
// ORGANIZER_UUID and the `tournaments` array below for each new batch, then
// re-run.
//
// Usage:
//   node --env-file=.env scripts/backfill-tournaments.mjs
import { createSupabaseAdminClient } from './lib/supabaseAdminClient.mjs'

const supabase = createSupabaseAdminClient()

const LEAGUE_UUID = 'e0149c0d-6aad-4cca-8525-9a04223e6a0e' // Lega Estiva 2025
const FORMAT_UUID = 'b8791cae-044b-448d-8152-87820afefe23' // Commander
const LOCATION_UUID = '09d441d5-a3fb-4e93-9352-e387a080f5ab' // Fantàsia, Rovereto
const ORGANIZER_UUID = '8a6f34d9-acea-4d75-8848-b36c41cd5efd' // Pauperwave

const tournaments = [
  { name: 'Prima tappa', date: '2025-08-01' },
  { name: 'Seconda tappa', date: '2025-08-29' },
  { name: 'Terza tappa', date: '2025-09-26' },
  { name: 'Quarta tappa', date: '2025-10-24' },
  { name: 'Recupero terza tappa', date: '2025-11-07' },
  { name: 'Quinta Tappa', date: '2025-11-28' }
].map(({ name, date }) => ({
  name,
  league_uuid: LEAGUE_UUID,
  format_uuid: FORMAT_UUID,
  location_uuid: LOCATION_UUID,
  organizer_uuid: ORGANIZER_UUID,
  status: 'completed',
  round_count: 2,
  round_current: 2,
  starts_at: `${date}T20:00:00+00:00`
}))

const { data, error } = await supabase.from('tournaments').insert(tournaments).select('id, uuid, name, starts_at')
if (error) throw error

console.log(`Inserted ${data.length} tournament(s):`)
console.table(data)
