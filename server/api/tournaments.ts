const tournaments = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1
  const dateObj = new Date(2025, 8, 2) // Start from 2025-09-02
  dateObj.setDate(dateObj.getDate() + i * 7) // Weekly increments

  const pad = (n: number) => n.toString().padStart(2, '0')
  // Supabase timestampz format: 'YYYY-MM-DDTHH:mm:ss+02:00' (CEST is UTC+2)
  const dateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:00+02:00`

  const formats = [
    'Commander', 'Commander Party', 'Commander Precon', 'Modern', 'Premodern'
  ]
  const format = formats[i % formats.length]

  const entryFees = [5.00, 10.00, 7.00, 6.00, 8.00]
  const entry_fee = entryFees[i % entryFees.length]

  const status = i < 5 ? 'Completed' : 'Scheduled'

  return {
    id,
    uuid: `${String.fromCharCode(97 + (i % 26))}${id}b${id + 1}c${id + 2}d${id + 3}-e${id + 4}f${id + 5}-g${id + 6}h${id + 7}-i${id + 8}j${id + 9}-k${id + 10}l${id + 11}m${id + 12}n${id + 13}o${id + 14}p${id + 15}`,
    event: null,
    league: 'Magman Autunno 2025',
    start_date: dateStr,
    round_count: 2 + (i % 3),
    round_duration: 50 + (i % 4) * 10,
    registered_players: 20 + (i % 13),
    organizer: 'Magman',
    format,
    status,
    location: 'Via S. Bernardino, 9, 38122 Trento TN',
    entry_fee,
    description: `Evento ${format} numero ${id}.`,
    prizes: i % 2 === 0 ? 'Buoni acquisto' : 'Buoni acquisto e gadget',
    companion_code: i < 5 ? `CODE${id}` : null,
    created_at: `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate() - 1)}T10:00:00Z`,
    updated_at: `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate() - 1)}T12:00:00Z`,
    updated_by: 'admin'
  }
})

export default defineEventHandler(async () => {
  return tournaments
})
