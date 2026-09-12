// server\utils\telegram\commands\mockups\mockPairing.ts

// MOCKUP — stands in for "what format is the tournament this table belongs
// to", which needs a live pairing lookup to know for real (see
// docs/architecture/telegram-bot.md's own Note on the same gap for
// tavolo.ts/risultato.ts's other mock data). Toggle by hand to preview
// either variant of /tavolo and /risultato until tournament_pairings has a
// live-write flow that can answer this for real.
//
// A standalone file (not owned by tavolo.ts or risultato.ts) so all three
// mockup files — tavolo.ts, risultato.ts (Commander), risultato1v1.ts —
// can read it without creating a new circular import between them.
export type TableFormat = 'commander' | '1v1'

export const MOCK_FORMAT: TableFormat = 'commander'
