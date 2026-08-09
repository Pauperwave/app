// server\api\standings\[format].get.ts

// Mock data for the per-format standings pages (/standings/commander,
// /standings/premodern, /standings/pauper), same convention as
// server/api/cittadino.ts: no Supabase table exists for this yet, raw placements
// only — points and final ordering are computed in useFormatStandingsQuery.ts.
//
// Unlike Cittadino's yearly editions, each format runs several seasonal "leghe" a
// year (2026-08-09: "Lega Estiva 2025", "Lega Invernale 2026", "Lega Estiva
// 2026", …) and — the important part — each league has its own regulation:
// counted-results and top-cutoff are per LEAGUE, not per format. Once real league
// data exists (historical leagues to come later, per the user) this file goes
// away in favour of a real query.
//
// Seeded per league so the matrix is identical on every request.

function createRng(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const FIRST_NAMES = [
  'Marco', 'Luca', 'Andrea', 'Matteo', 'Francesco', 'Alessandro', 'Davide', 'Simone',
  'Giacomo', 'Federico', 'Riccardo', 'Stefano', 'Nicola', 'Giulia', 'Chiara', 'Sara'
]

const LAST_NAMES = [
  'Rossi', 'Bianchi', 'Ferrari', 'Esposito', 'Russo', 'Romano', 'Colombo', 'Ricci',
  'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa', 'Giordano'
]

interface FormatLeague {
  uuid: string
  name: string
  seed: number
  playerCount: number
  countedResults: number
  topCutoff: number
  events: [date: string, name: string][]
}

// Oldest first — the last entry in each format's list is the current league,
// resolved when no `?league=` (or an unknown one) is requested. Only the current
// league's calendar (5 events, best-4, top-8) was confirmed with real dates
// (2026-08-09); the two historical ones per format are fictional, deliberately
// scored under different regulations to show that leagues aren't uniform.
const LEAGUES: Partial<Record<string, FormatLeague[]>> = {
  commander: [
    {
      uuid: 'cmd-lega-2025-estiva',
      name: 'Lega Estiva 2025',
      seed: 20250601,
      playerCount: 12,
      countedResults: 3,
      topCutoff: 6,
      events: [
        ['2025-06-12', 'Commander #1'],
        ['2025-07-10', 'Commander #2'],
        ['2025-08-14', 'Commander #3'],
        ['2025-09-11', 'Commander #4']
      ]
    },
    {
      uuid: 'cmd-lega-2026-invernale',
      name: 'Lega Invernale 2026',
      seed: 20260101,
      playerCount: 14,
      countedResults: 4,
      topCutoff: 8,
      events: [
        ['2026-01-15', 'Commander #1'],
        ['2026-02-12', 'Commander #2'],
        ['2026-03-12', 'Commander #3'],
        ['2026-04-09', 'Commander #4'],
        ['2026-05-14', 'Commander #5'],
        ['2026-06-11', 'Commander #6']
      ]
    },
    {
      uuid: 'cmd-lega-2026-estiva',
      name: 'Lega Estiva 2026',
      seed: 20260709,
      playerCount: 16,
      countedResults: 4,
      topCutoff: 8,
      events: [
        ['2026-07-30', 'Commander #1'],
        ['2026-09-30', 'Commander #2'],
        ['2026-10-28', 'Commander #3'],
        ['2026-11-18', 'Commander #4'],
        ['2026-12-09', 'Commander #5']
      ]
    }
  ],
  premodern: [
    {
      uuid: 'pmd-lega-2025-estiva',
      name: 'Lega Estiva 2025',
      seed: 20250602,
      playerCount: 12,
      countedResults: 3,
      topCutoff: 6,
      events: [
        ['2025-06-19', 'Premodern #1'],
        ['2025-07-17', 'Premodern #2'],
        ['2025-08-21', 'Premodern #3'],
        ['2025-09-18', 'Premodern #4']
      ]
    },
    {
      uuid: 'pmd-lega-2026-invernale',
      name: 'Lega Invernale 2026',
      seed: 20260102,
      playerCount: 14,
      countedResults: 4,
      topCutoff: 8,
      events: [
        ['2026-01-22', 'Premodern #1'],
        ['2026-02-19', 'Premodern #2'],
        ['2026-03-19', 'Premodern #3'],
        ['2026-04-16', 'Premodern #4'],
        ['2026-05-21', 'Premodern #5'],
        ['2026-06-18', 'Premodern #6']
      ]
    },
    {
      uuid: 'pmd-lega-2026-estiva',
      name: 'Lega Estiva 2026',
      seed: 20260710,
      playerCount: 16,
      countedResults: 4,
      topCutoff: 8,
      events: [
        ['2026-07-30', 'Premodern #1'],
        ['2026-09-30', 'Premodern #2'],
        ['2026-10-28', 'Premodern #3'],
        ['2026-11-18', 'Premodern #4'],
        ['2026-12-09', 'Premodern #5']
      ]
    }
  ],
  pauper: [
    {
      uuid: 'pau-lega-2025-estiva',
      name: 'Lega Estiva 2025',
      seed: 20250603,
      playerCount: 12,
      countedResults: 3,
      topCutoff: 6,
      events: [
        ['2025-06-26', 'Pauper #1'],
        ['2025-07-24', 'Pauper #2'],
        ['2025-08-28', 'Pauper #3'],
        ['2025-09-25', 'Pauper #4']
      ]
    },
    {
      uuid: 'pau-lega-2026-invernale',
      name: 'Lega Invernale 2026',
      seed: 20260103,
      playerCount: 14,
      countedResults: 4,
      topCutoff: 8,
      events: [
        ['2026-01-29', 'Pauper #1'],
        ['2026-02-26', 'Pauper #2'],
        ['2026-03-26', 'Pauper #3'],
        ['2026-04-23', 'Pauper #4'],
        ['2026-05-28', 'Pauper #5'],
        ['2026-06-25', 'Pauper #6']
      ]
    },
    {
      uuid: 'pau-lega-2026-estiva',
      name: 'Lega Estiva 2026',
      seed: 20260711,
      playerCount: 16,
      countedResults: 4,
      topCutoff: 8,
      events: [
        ['2026-07-30', 'Pauper #1'],
        ['2026-09-30', 'Pauper #2'],
        ['2026-10-28', 'Pauper #3'],
        ['2026-11-18', 'Pauper #4'],
        ['2026-12-09', 'Pauper #5']
      ]
    }
  ]
}

function buildLeagueStandings(format: string, league: FormatLeague) {
  const rng = createRng(league.seed)

  const events = league.events.map(([date, name], i) => ({
    uuid: `${league.uuid}-evt-${(i + 1).toString().padStart(2, '0')}`,
    name,
    date
  }))

  const players = Array.from({ length: league.playerCount }, (_, i) => ({
    uuid: `${league.uuid}-ply-${(i + 1).toString().padStart(2, '0')}`,
    name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
    // How likely this player is to show up at any given event.
    regularity: 0.35 + rng() * 0.6
  }))

  const results = events.flatMap((event) => {
    const attendees = players.filter(player => rng() < player.regularity)

    for (let i = attendees.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[attendees[i], attendees[j]] = [attendees[j]!, attendees[i]!]
    }

    return attendees.map((player, index) => ({
      player_uuid: player.uuid,
      player_name: player.name,
      event_uuid: event.uuid,
      rank: index + 1
    }))
  })

  return { events, results }
}

export default defineEventHandler((event) => {
  const format = getRouterParam(event, 'format') ?? ''
  const leagues = LEAGUES[format]

  if (!leagues) {
    throw createError({ statusCode: 404, statusMessage: `No leagues for format "${format}"` })
  }

  const requested = String(getQuery(event).league ?? '')
  const league = leagues.find(candidate => candidate.uuid === requested)
    ?? leagues[leagues.length - 1]!

  return {
    league: league.uuid,
    leagues: leagues.map(({ uuid, name }) => ({ uuid, name })),
    countedResults: league.countedResults,
    topCutoff: league.topCutoff,
    ...buildLeagueStandings(format, league)
  }
})
