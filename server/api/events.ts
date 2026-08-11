// server\api\events.ts
// fallow-ignore-file code-duplication -- mirrors leagues.ts/tournaments.ts's mock
// generator shape on purpose; expected to diverge once real Supabase tables land
const events = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1
  const dateObj = new Date(2025, 8, 2) // Start from 2025-09-02
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

  return {
    id,
    status,
    tournament_count: 1 + (i % 3),
    name: `Evento ${season} 2025 - Settimana ${id}`,
    start_date: dateStr,
    created_at: dateStr,
    updated_at: dateStr,
    updated_by: 'admin'
  }
})

export default defineEventHandler(async () => {
  return events
})
