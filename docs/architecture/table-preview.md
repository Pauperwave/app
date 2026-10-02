# Table preview ("Anteprima tavoli")

<!-- docs/architecture/table-preview.md -->

How the table preview modals build, show and validate the seating before a round starts. Commander uses `TablePreviewModal.vue`, 1v1 (Swiss) uses `SwissTablePreviewModal.vue`, both under `app/components/tournaments/single/pairing/`.

## Standing line under each player (round 2+)

From round 2 every player gets one line under the name so the organizer can see why the tables came out this way. Built by `app/utils/tournaments/tablePlayerStanding.ts`, rendered by `TablePlayerStandingLine.vue`.

| | Example | Tiebreakers, in ranking order |
|---|---|---|
| **1v1** | `#3 · 7 pt · 2-1-0 · OMW% 66.7/GW% 80.0/OGW% 55.5` | record V-P-S, then OMW%, GW%, OGW% (as `SwissStandingsTable.vue`) |
| **Commander** | `#1 · 12 pt · 🏆 2/🗡 3/🧪 1/⚡ 0` | victories, kills, brew votes, play votes (as `compareCommanderStandings`) |

- Commander tiebreakers are shown as icons, the same as `CommanderStandingsTable.vue`'s column headers: `ICONS.standings`, `ICONS.kills`, `ICONS.brewVotes`, `ICONS.playVotes`. The emoji above only stand in for those icons. 1v1 still shows text labels (to be revised).
- The rank counts every player, dropped ones too, so it matches the standings table.
- One line that never wraps; the tooltip spells every tiebreaker out by name.
- Not shown on round 1: there are no standings yet.

## How the seating is built

| Round | Commander | 1v1 |
|---|---|---|
| **1** | Seeded random shuffle | Seeded random shuffle |
| **2+** | Optimizer over the standings ("Ottimizza") | Swiss pairing by standings, no rematches (ADR-043) |

- The seed (a "SEC-123" code, `shared/utils/seededShuffle.ts`) exists on round 1 only: copyable ticket, "Usa un seed" to paste one back, "Randomizza" for a new one. Same seed + same players = same tables. From round 2 these controls are hidden.
- Round 1's seed is saved on confirm (`tournament_rounds.shuffle_seed`).
- After a turn-back, the preview reopens on the tables approved for that round (`useConfirmedSeatings.ts`), as long as the players are the same and the round before it wasn't redone. Kept for the page only: a reload after the turn-back starts over.

## Rules checked before confirm (Commander)

Drag-and-drop is free; the rules only block "Conferma".

- Every table has 3 or 4 players (pairings have four player columns); empty tables are dropped.
- Tables of 3 come after every table of 4.
- A table breaking a rule shows a one-line warning in its card header; the footer names the first table to fix (e.g. "Il tavolo 2 ha 5 giocatori: ne servono 3 o 4").
- The confirmed table sizes are sent to `start_commander_round_one`/`advance_commander_round` (`p_table_sizes`), which seat them as given instead of re-deriving their own split.
- The seat number badge (1–4) is the `player1…player4` order the tables are saved in.
