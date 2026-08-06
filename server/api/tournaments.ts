// server\api\tournaments.ts
const tournaments = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1
  const dateObj = new Date(2025, 8, 2) // Start from 2025-09-02
  dateObj.setDate(dateObj.getDate() + i * 7) // Weekly increments

  const pad = (n: number) => n.toString().padStart(2, '0')
  dateObj.setHours(20, 0, 0, 0) // Set start time to 20:00 (8 PM)
  const dateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:00+02:00`

  const seasons = [
    'Primavera', 'Estate', 'Autunno', 'Inverno'
  ]
  const season = seasons[i % seasons.length]

  const places = [
    'Trento', 'Bolzano', 'Verona', 'Milano', 'Roma'
  ]
  const place = places[i % places.length]

  const organizers = [
    'PauperWave', 'CommanderWave', 'Magman', 'MagicCorner'
  ]
  const organizer = organizers[i % organizers.length]

  const formats = [
    'Commander', 'Commander Party', 'Commander Precon', 'Modern', 'Premodern'
  ]
  const format = formats[i % formats.length]

  const entryFees = [5.00, 10.00, 7.00, 6.00, 8.00]
  const entry_fee = entryFees[i % entryFees.length]

  const statuses = [
    'Scheduled',
    'Cancelled',
    'In Progress',
    'Completed'
  ]
  const status = statuses[i % statuses.length]

  return {
    id,
    uuid: crypto.randomUUID(),
    event: null,
    league: `${place} ${season} 2025`,
    name: `Tournament ${id}`,
    start_date: dateStr,
    round_count: 2 + (i % 3),
    round_duration: 50 + (i % 4) * 10,
    registered_players: 20 + (i % 13),
    organizer,
    format,
    status,
    location: 'Via S. Bernardino, 9, 38122 Trento TN',
    entry_fee,
    description: `Evento ${format} numero ${id}.`,
    prizes: i % 2 === 0 ? 'Buoni acquisto' : 'Buoni acquisto e gadget',
    companion_code: i < 5 ? `CODE${id}` : null,
    created_at: dateStr,
    updated_at: dateStr,
    updated_by: 'admin'
  }
})

export default defineEventHandler(async () => {
  return tournaments
})
