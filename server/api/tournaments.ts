// server\api\tournaments.ts
// fallow-ignore-file code-duplication -- mirrors events.ts/leagues.ts's mock
// generator shape on purpose; expected to diverge once real Supabase tables land
// MOCK_EVENTS comes from server/utils/mockEvents.ts (Nitro auto-import, no
// explicit import statement) — see that file's comment for why it isn't a
// plain cross-route import of events.ts instead.

// Anchored to today, same reasoning as mockEvents.ts — only applies to the
// standalone tournaments below (not one of linkedEvents); linked ones
// inherit their date from the event they belong to instead.
const anchor = new Date()
anchor.setDate(anchor.getDate() - 12 * 7)

// Two of MOCK_EVENTS land in the current month by construction (index 12 is
// exactly "today", weekly increments either side — see mockEvents.ts's
// anchor): give them 3 and 5 tournaments respectively so /calendario's
// default view (current month) always has example nested tournaments,
// not just when navigating to an older month. The rest of the tournaments
// below stay standalone (event: null), same as before this was added.
const LINKED_EVENT_INDEXES = [12, 13]
const LINKED_COUNTS = [3, 5]
const linkedEvents = LINKED_EVENT_INDEXES.flatMap((eventIndex, groupIndex) =>
  Array.from({ length: LINKED_COUNTS[groupIndex] ?? 0 }, () => MOCK_EVENTS[eventIndex]))

const tournaments = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1
  const linkedEvent = linkedEvents[i]

  const dateObj = linkedEvent ? new Date(linkedEvent.start_date) : new Date(anchor)
  if (!linkedEvent) dateObj.setDate(dateObj.getDate() + i * 7) // Weekly increments

  const pad = (n: number) => n.toString().padStart(2, '0')
  dateObj.setHours(20, 0, 0, 0) // Set start time to 20:00 (8 PM)
  const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+02:00`
  const dateStr = toDateStr(dateObj)

  // Explicit end time, not derived from round_count * round_duration (those
  // stay independent fields) — a real "inizio"/"fine" pair once a Supabase
  // table backs this, per the user's request 2026-08-14. Durations vary so
  // tournaments within the same event can visibly overlap on /calendario.
  const durationsHours = [1.5, 2, 2.5, 3, 3.5]
  const durationHours = durationsHours[i % durationsHours.length] ?? 2
  const endDateObj = new Date(dateObj.getTime() + durationHours * 3600000)
  const endDateStr = toDateStr(endDateObj)

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
    'scheduled',
    'canceled',
    'ongoing',
    'completed'
  ]
  const status = statuses[i % statuses.length]

  return {
    id,
    uuid: crypto.randomUUID(),
    event: linkedEvent ? linkedEvent.name : null,
    league: `${place} ${season} 2025`,
    name: `Tournament ${id}`,
    start_date: dateStr,
    end_date: endDateStr,
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
    image: null as string | null, // overridden below for one example tournament
    created_at: dateStr,
    updated_at: dateStr,
    updated_by: 'admin'
  }
})

// A deliberate example fixture, not part of the formula-generated data above
// — the user asked specifically for a Draft named "Lo Hobbit" on August 30th
// with this cover image, as a concrete example of Tournament.image on
// /calendario (2026-08-14). Overwrites one of the standalone (unlinked)
// tournaments in place rather than adding a 31st entry. Rolls forward to
// next year if this year's August 30th has already passed, so the example
// doesn't just vanish out of the calendar during a long-running dev server.
const hobbitDraft = tournaments[20]
if (hobbitDraft) {
  const now = new Date()
  const pastAug30 = now.getMonth() > 7 || (now.getMonth() === 7 && now.getDate() > 30)
  const hobbitYear = now.getFullYear() + (pastAug30 ? 1 : 0)
  const hobbitStart = `${hobbitYear}-08-30T20:00:00+02:00`
  const hobbitEnd = `${hobbitYear}-08-30T23:00:00+02:00`

  hobbitDraft.event = null
  hobbitDraft.name = 'Draft "Lo Hobbit"'
  hobbitDraft.format = 'Draft'
  hobbitDraft.start_date = hobbitStart
  hobbitDraft.end_date = hobbitEnd
  hobbitDraft.created_at = hobbitStart
  hobbitDraft.updated_at = hobbitStart
  hobbitDraft.image = 'https://images.ctfassets.net/s5n2t79q9icq/5C1850DJDvhD3otrpCeE3c/f4d4de80cb37c59cdee000582e223999/Bioar8rbgkaorbnieob_575x700.webp?fm=webp'
}

export default defineEventHandler(async () => {
  return tournaments
})
