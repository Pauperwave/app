// server\api\cittadino.ts

// Mock data for the Campionato Cittadino standings matrix. No Supabase table
// exists for this yet (see the P1 entry in docs/BACKLOG.md) — this endpoint stands
// in for what will eventually come from `tournament_standings.player_rank`, and
// deliberately returns *raw placements only*: points, best-11 selection and final
// ordering are computed in useCittadinoQuery.ts, which is where the real
// aggregation will live once the data is real.
//
// Seeded per edition so the matrix is identical on every request — a mockup being
// evaluated for layout must not reshuffle under the reader.

const FIRST_NAMES = [
  'Marco', 'Luca', 'Andrea', 'Matteo', 'Francesco', 'Alessandro', 'Davide', 'Simone',
  'Giacomo', 'Federico', 'Riccardo', 'Stefano', 'Nicola', 'Paolo', 'Michele', 'Giulia',
  'Chiara', 'Sara', 'Elisa', 'Martina', 'Anna', 'Laura', 'Silvia'
]

// 25 surnames against 23 first names: the two lengths are coprime, so pairing them
// by index gives 46 distinct full names without repeats.
const LAST_NAMES = [
  'Rossi', 'Bianchi', 'Ferrari', 'Esposito', 'Russo', 'Romano', 'Colombo', 'Ricci',
  'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa', 'Giordano',
  'Mancini', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro',
  'Villa', 'Caruso'
]

// Editions the archive holds, oldest first. The current one is the last.
// 2022/2023 added 2026-08-09: the user confirmed the ranking actually started
// then, not 2024 — real data for those two years isn't available yet (the user
// can retrieve it), so they're mocked the same way as every other edition here
// until it is. See docs/BACKLOG.md.
const EDITIONS = ['2022', '2023', '2024', '2025', '2026']

// The calendar shape, roughly two events a month: the three league formats running
// as numbered legs, interleaved with the one-off draft/sealed events the
// regulation also counts. Month/day are fixed; the year comes from the edition.
// Format strings must match the keys in app/utils/cittadinoFormats.ts — a typo
// silently falls back to the neutral chip rather than failing.
const CALENDAR: [monthDay: string, name: string, format: string][] = [
  ['01-10', 'Pauper #1', 'Pauper'],
  ['01-24', 'Commander #1', 'Commander'],
  ['02-07', 'Premodern #1', 'Premodern'],
  ['02-21', 'Draft Lo Hobbit', 'Draft'],
  ['03-07', 'Pauper #2', 'Pauper'],
  ['03-21', 'Commander #2', 'Commander'],
  ['04-11', 'Oldschool #1', 'Oldschool'],
  ['04-25', 'Cubo Vintage #1', 'Cubo Vintage'],
  ['05-09', 'Pauper #3', 'Pauper'],
  ['05-23', 'Commander #3', 'Commander'],
  ['06-06', 'Premodern #2', 'Premodern'],
  ['06-20', 'Cubo Commander #1', 'Cubo Commander'],
  ['07-04', 'Pauper #4', 'Pauper'],
  ['07-18', 'Commander #4', 'Commander'],
  ['08-08', 'Oldschool #2', 'Oldschool'],
  ['08-22', 'Draft Foundations', 'Draft'],
  ['09-05', 'Pauper #5', 'Pauper'],
  ['09-19', 'Commander #5', 'Commander'],
  ['10-10', 'Premodern #3', 'Premodern'],
  ['10-24', 'Cubo Vintage #2', 'Cubo Vintage'],
  ['11-07', 'Pauper #6', 'Pauper'],
  ['11-21', 'Cubo Commander #2', 'Cubo Commander'],
  ['12-05', 'Sealed Aetherdrift', 'Sealed'],
  ['12-19', 'Draft Innistrad Remastered', 'Draft']
]

// Earlier editions were smaller — fewer events on the calendar and a smaller pool
// of players, so switching tabs visibly changes the shape of the matrix.
const EDITION_SIZES: Record<string, { events: number, players: number }> = {
  2022: { events: 8, players: 16 },
  2023: { events: 11, players: 22 },
  2024: { events: 14, players: 28 },
  2025: { events: 19, players: 37 },
  2026: { events: 24, players: 46 }
}

function buildEdition(edition: string) {
  const size = EDITION_SIZES[edition] ?? EDITION_SIZES['2026']!
  const rng = createRng(Number(edition) * 10007)

  const events = CALENDAR.slice(0, size.events).map(([monthDay, name, format], i) => ({
    uuid: `evt-${edition}-${(i + 1).toString().padStart(2, '0')}`,
    name,
    date: `${edition}-${monthDay}`,
    format
  }))

  // Regularity range produces a realistic mix of regulars (who exceed the
  // best-11 threshold) and occasional players (who never reach it).
  const players = buildMockPlayers(size.players, 'ply-', FIRST_NAMES, LAST_NAMES, rng, [0.2, 0.75])

  // For each event, draw the attendees and shuffle them into a final placement.
  // fallow-ignore-next-line code-duplication -- residual similarity is just the
  // shared buildMockPlayers/buildEventPlacements call site, same shape in
  // standings/[format].get.ts
  const results = events.flatMap(event => buildEventPlacements(players, event.uuid, rng))

  return { events, results }
}

export default defineEventHandler((event) => {
  const requested = String(getQuery(event).edition ?? '')
  const edition = EDITIONS.includes(requested) ? requested : EDITIONS[EDITIONS.length - 1]!

  return { edition, editions: EDITIONS, ...buildEdition(edition) }
})
