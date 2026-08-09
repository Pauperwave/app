// app\utils\cittadinoPoints.ts

// Scoring rules from the "Regolamento Campionato Cittadino '26" — see the P1 entry
// in docs/BACKLOG.md for the full regulation.

// Points for 10th place and below.
export const CITTADINO_MIN_POINTS = 1

// Index 0 is 1st place; anything past the end scores CITTADINO_MIN_POINTS.
export const CITTADINO_POINTS_BY_RANK = [25, 18, 15, 12, 10, 8, 6, 4, 2]

// Only each player's best N results count toward the final standings — the reason
// the total cannot be a plain sum of everything played.
export const CITTADINO_COUNTED_RESULTS = 11

// How many players qualify for the final ("la top16 di questa classifica disputerà
// la finale del cittadino in un torneo dedicato").
export const CITTADINO_FINALISTS = 16

export function cittadinoPointsForRank(rank: number): number {
  return CITTADINO_POINTS_BY_RANK[rank - 1] ?? CITTADINO_MIN_POINTS
}
