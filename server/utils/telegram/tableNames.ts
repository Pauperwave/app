// server\utils\telegram\tableNames.ts
import type { RoundTimerNames } from '#shared/utils/tournaments/roundTimerState'

interface TableWithPlayers {
  myFirstName?: string | null
  opponent?: { firstName: string | null }
}

// The first names the turns Mini App shows instead of "Io" and "Avversario": only for a 1v1 table
// (a Commander pod has no single opponent) and only when both are known, so a screen never mixes a
// name with a generic label
export function tableNames(table: TableWithPlayers | null): RoundTimerNames | null {
  const me = table?.myFirstName
  const opponent = table?.opponent?.firstName
  return me && opponent ? { me, opponent } : null
}
