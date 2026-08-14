// server\utils\mockEvents.ts

// Shared by server/api/events.ts and server/api/tournaments.ts (the latter
// links some mock tournaments to one of these by name, Tournament.event —
// see app/types/index.d.ts). Lives under server/utils/, not inside
// events.ts itself, so it's a Nitro auto-import rather than a cross-route
// import: importing a named export from another server/api/*.ts route file
// is unreliable in dev (the array came back empty at runtime, confirmed
// 2026-08-13) since Nitro treats each api route as its own isolated entry.

// Anchored to today (not a fixed calendar date) so the public /calendario
// page's "current month" default always has something to show — 12
// weeks back to 17 weeks forward, weekly increments, evaluated once at
// module load (server start).
const anchor = new Date()
anchor.setDate(anchor.getDate() - 12 * 7)

export const MOCK_EVENTS = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1
  const dateObj = new Date(anchor)
  dateObj.setDate(dateObj.getDate() + i * 7) // Weekly increments

  const pad = (n: number) => n.toString().padStart(2, '0')
  // Supabase timestampz format: 'YYYY-MM-DDTHH:mm:ss+02:00' (CEST is UTC+2)
  const dateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:00+02:00`

  const statuses = [
    'scheduled',
    'ongoing',
    'completed',
    'canceled'
  ]
  const status = statuses[i % statuses.length]

  const seasons = [
    'Spring', 'Summer', 'Autumn', 'Winter'
  ]
  const season = seasons[i % seasons.length]

  const locations = [
    'Ludoteca Chiodo Fisso, Milano',
    'Fumetteria Zap!, Bologna',
    'Circolo Ludico Torinese, Torino',
    'Game Room Roma, Roma'
  ]
  const location = locations[i % locations.length]

  return {
    id,
    status,
    tournament_count: 1 + (i % 3),
    name: `Evento ${season} ${dateObj.getFullYear()} - Settimana ${id}`,
    start_date: dateStr,
    location,
    image: null, // optional — no example event cover image yet
    created_at: dateStr,
    updated_at: dateStr,
    updated_by: 'admin'
  }
})
