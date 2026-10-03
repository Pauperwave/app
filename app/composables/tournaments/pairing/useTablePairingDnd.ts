// app\composables\tournaments\pairing\useTablePairingDnd.ts
// State and validation layer for table drag-and-drop plus pairing constraints/scoring, ported from
// league's useTableDnd.ts. Player identity is a string (associate uuid) instead of league's numeric
// id. Drag-and-drop itself is wired by TableCard.vue via vue-draggable-plus (see PodsManager.vue);
// this file only tracks, validates and scores state.
import type { BadgeProps } from '@nuxt/ui'
import { seededShuffle } from '#shared/utils/seededShuffle'
import type { PairingForbiddenPair, PairingWeights, PairingTable, Seat } from '~/types'
import type { PairingPlayer, PairingHistoryEntry, PairingScoreDetails } from '~/composables/tournaments/pairing/pairingOptimizer'

export interface TableStatus {
  color: BadgeProps['color']
  label: string
  // Why the table blocks confirm, shown on its card.
  warning?: string
}

type TableRuleViolation = 'size' | 'threeNotLast'

function cloneTables(tables: PairingTable[]): PairingTable[] {
  return tables.map(table => ({
    id: table.id,
    tableNumber: table.tableNumber,
    seats: table.seats.map(seat => ({
      id: seat.id,
      // Whole player copied (name parts, standing too), not just value/label.
      player: seat.player ? { ...seat.player } : null
    }))
  }))
}

/**
 * Rebuilds a table's seat shape: every occupied seat is kept (no cap on table size: tables are
 * freely resizable by drag, and a hardcoded max silently truncated the seat past it, looking like a
 * reverted drag), plus exactly one trailing empty seat so there is always somewhere to drop. An
 * occupied `seat.id` is keyed by the player's uuid, not array position: TableCard.vue's `v-for ...
 * :key="seat.id"` needs a key stable across reorders, or Vue patches the same "seat N" node in
 * place and desyncs an in-progress drag from the DOM node it picked up. Empty seats keep a
 * positional id (interchangeable). /
 */
function normalizeSeats(tableId: string, seats: Seat[]): Seat[] {
  const players = seats
    .filter(seat => seat.player !== null)
    .map(seat => ({
      id: `${tableId}-player-${seat.player!.value}`,
      player: seat.player
    }))

  return [
    ...players,
    { id: `${tableId}-empty-${players.length + 1}`, player: null }
  ]
}

function extractPlayerIds(tables: PairingTable[]): string[] {
  return tables
    .flatMap(table => table.seats)
    .map(seat => seat.player?.value)
    .filter((id): id is string => id !== undefined)
}

function ensureTableSeatShape(tables: PairingTable[]): PairingTable[] {
  return tables.map(table => ({
    ...table,
    seats: normalizeSeats(table.id, [...table.seats])
  }))
}

function buildTablesFromOrder(tables: PairingTable[], playerOrder: string[]): PairingTable[] {
  const sourcePlayers = tables
    .flatMap(table => table.seats)
    .map(seat => seat.player)
    .filter((player): player is NonNullable<Seat['player']> => player !== null)

  const playerMap = new Map(sourcePlayers.map(player => [player.value, player]))
  let cursor = 0

  return tables.map((table) => {
    const occupied = table.seats.filter(seat => seat.player !== null).length
    const nextSeats = Array.from({ length: occupied }, (_, index) => {
      const playerId = playerOrder[cursor + index]
      const player = playerId !== undefined ? playerMap.get(playerId) ?? null : null

      return {
        id: player !== null ? `${table.id}-player-${player.value}` : `${table.id}-empty-${index + 1}`,
        player
      }
    })

    cursor += occupied

    return { ...table, seats: nextSeats }
  })
}

/**
 * Scoring inputs are `MaybeRefOrGetter` on purpose: each is fed by an async Pinia Colada query
 * while the caller builds its options once in `setup()`, so plain values would capture whatever had
 * resolved by then. Pass getters (`() => x`) so `toValue` re-reads them as the queries resolve. /
 */
export function useTablePairingDnd(initialTables: PairingTable[], params?: {
  playersForScoring?: MaybeRefOrGetter<PairingPlayer[]>
  history?: MaybeRefOrGetter<PairingHistoryEntry[]>
  /** Cross-tournament meeting count per pair key — flat rematch signal, see pairingOptimizer. */
  leagueRematchCounts?: MaybeRefOrGetter<Map<string, number>>
  currentRound?: MaybeRefOrGetter<number>
  initialForbiddenPairs?: PairingForbiddenPair[]
  initialWeights?: Partial<PairingWeights>
}) {
  const { t } = useI18n()
  const { calculatePods } = useCommanderPods()

  const sourceTables = ref<PairingTable[]>(ensureTableSeatShape(cloneTables(initialTables)))
  const localTables = ref<PairingTable[]>(ensureTableSeatShape(cloneTables(initialTables)))
  const isDragging = ref(false)

  const weights = ref<PairingWeights>({
    ...DEFAULT_PAIRING_WEIGHTS,
    ...(params?.initialWeights ?? {})
  })

  const forbiddenPairs = ref<PairingForbiddenPair[]>(
    normalizePairingForbiddenPairs(params?.initialForbiddenPairs ?? [])
  )

  const sourcePlayerIds = computed(() => extractPlayerIds(sourceTables.value))
  const localPlayerIds = computed(() => extractPlayerIds(localTables.value))
  const currentRound = computed(() => toValue(params?.currentRound) ?? 1)

  // Source order is the standings from round 2 on; round 1 has none, so registration order must not
  // act as strength. Listed in current seating order so the optimizer's ties keep the shown tables
  // instead of reverting to registration order.
  const fallbackPlayersForScoring = computed<PairingPlayer[]>(() => {
    const rankById = new Map(sourcePlayerIds.value.map((id, index) =>
      [id, currentRound.value > 1 ? index + 1 : 1]))

    return localPlayerIds.value.map(id => ({
      id,
      rank: rankById.get(id) ?? 1,
      score: 0,
      table3Count: 0
    }))
  })

  const playersForScoring = computed(() => {
    const provided = toValue(params?.playersForScoring) ?? []
    if (provided.length > 0) return provided
    return fallbackPlayersForScoring.value
  })
  const history = computed(() => toValue(params?.history) ?? [])
  const leagueRematchCounts = computed(
    () => toValue(params?.leagueRematchCounts) ?? new Map<string, number>()
  )

  const noDuplicates = computed(() =>
    new Set(localPlayerIds.value).size === localPlayerIds.value.length)

  const noMissingPlayers = computed(() => {
    if (sourcePlayerIds.value.length !== localPlayerIds.value.length) return false

    const localSet = new Set(localPlayerIds.value)
    return sourcePlayerIds.value.every(id => localSet.has(id))
  })

  const currentTablesAsIds = computed<string[][]>(() =>
    localTables.value
      .map(table =>
        table.seats.map(seat => seat.player?.value).filter((id): id is string => id !== undefined))
      .filter(table => table.length > 0))

  const scoreDetails = computed<PairingScoreDetails>(() => scorePairingTables({
    tables: currentTablesAsIds.value,
    players: playersForScoring.value,
    history: history.value,
    leagueRematchCounts: leagueRematchCounts.value,
    forbiddenPairs: forbiddenPairs.value,
    currentRound: currentRound.value,
    weights: weights.value
  }))

  // Seated tables in table order (empty ones are dropped on confirm)
  const seatedTables = computed(() =>
    [...localTables.value]
      .sort((a, b) => a.tableNumber - b.tableNumber)
      .map(table => ({ table, size: table.seats.filter(seat => seat.player !== null).length }))
      .filter(entry => entry.size > 0))

  // Drag stays free, but confirm needs 3-4 seat tables (pairings have four player columns), with
  // every table of 3 after the tables of 4 (house convention)
  const tableRuleViolations = computed(() => {
    const violations = new Map<string, TableRuleViolation>()

    seatedTables.value.forEach((entry, index) => {
      const fourAfter = seatedTables.value.slice(index + 1).some(next => next.size === 4)

      if (entry.size < 3 || entry.size > 4) {
        violations.set(entry.table.id, 'size')
      } else if (entry.size === 3 && fourAfter) {
        violations.set(entry.table.id, 'threeNotLast')
      }
    })

    return violations
  })

  const tableRulesValid = computed(() => tableRuleViolations.value.size === 0)

  const isValid = computed(() =>
    tableRulesValid.value
    && noDuplicates.value
    && noMissingPlayers.value
    && scoreDetails.value.isValid)

  const playerOrder = computed(() => extractPlayerIds(seatedTables.value.map(entry => entry.table)))

  // Sent with playerOrder so the server seats the confirmed tables instead of re-deriving its own
  // split.
  const tableSizes = computed(() => seatedTables.value.map(entry => entry.size))

  const forbiddenPairMap = computed(() => {
    const map = new Set<string>()
    for (const pair of forbiddenPairs.value) {
      map.add(getForbiddenPairKey(pair.playerA, pair.playerB))
    }
    return map
  })

  const conflictingTables = computed(() => {
    const conflicts = new Set<string>()

    for (const table of localTables.value) {
      const playerIds = table.seats
        .map(seat => seat.player?.value)
        .filter((id): id is string => id !== undefined)

      for (let i = 0; i < playerIds.length; i++) {
        for (let j = i + 1; j < playerIds.length; j++) {
          const left = playerIds[i]
          const right = playerIds[j]
          if (left === undefined || right === undefined) continue

          if (forbiddenPairMap.value.has(getForbiddenPairKey(left, right))) {
            conflicts.add(table.id)
          }
        }
      }
    }

    return conflicts
  })

  // Names the first table to fix, e.g. "Il tavolo 2 ha 5 giocatori: ne servono 3 o 4", plus how
  // many more.
  const tableRulesError = computed(() => {
    const broken = seatedTables.value
      .filter(entry => tableRuleViolations.value.has(entry.table.id))
    const first = broken[0]
    if (!first) return ''

    const message = tableRuleViolations.value.get(first.table.id) === 'size'
      ? t('tournament.single.tablePreview.tableSizeError', { n: first.table.tableNumber, count: first.size })
      : t('tournament.single.tablePreview.tableThreeNotLastError', { n: first.table.tableNumber })
    const others = broken.length - 1

    return others > 0
      ? `${message} ${t('tournament.single.tablePreview.moreTableErrors', { count: others }, others)}`
      : message
  })

  const previewError = computed(() => {
    if (tableRulesError.value) return tableRulesError.value
    if (!noDuplicates.value) return t('tournament.single.tablePreview.duplicatePlayers')
    if (!noMissingPlayers.value) return t('tournament.single.tablePreview.missingPlayers')
    if (!scoreDetails.value.isValid) return t('tournament.single.tablePreview.forbiddenPairsPresent')
    return ''
  })

  function setDragging(value: boolean) {
    isDragging.value = value
  }

  function reset() {
    localTables.value = ensureTableSeatShape(cloneTables(sourceTables.value))
    isDragging.value = false
  }

  function syncFromSource(tables: PairingTable[]) {
    const normalized = ensureTableSeatShape(cloneTables(tables))
    sourceTables.value = normalized
    localTables.value = ensureTableSeatShape(cloneTables(normalized))
    isDragging.value = false
  }

  function normalizeLocalTables() {
    localTables.value = ensureTableSeatShape(cloneTables(localTables.value))
  }

  /**
   * Applies one table's seat list after a drag-and-drop update (TableCard.vue's VueDraggable
   * v-model emit), re-running normalizeSeats to restore the shape invariant (occupied seats kept,
   * one trailing empty placeholder). Otherwise dragging a player OUT left no placeholder, and
   * TableSeatItem.vue renders a "drop here" target only for a `player: null` seat. /
   */
  function updateTableSeats(tableIndex: number, seats: Seat[]) {
    const targetTable = localTables.value[tableIndex]
    if (!targetTable) return
    targetTable.seats = normalizeSeats(targetTable.id, seats)
  }

  function replaceByPlayerOrder(order: string[]) {
    localTables.value = ensureTableSeatShape(buildTablesFromOrder(localTables.value, order))
  }

  // Seats each table exactly as given (its own size too), so a drag-resized layout gets valid 3-4
  // tables back.
  function replaceByTables(playerTables: string[][]) {
    if (playerTables.length !== localTables.value.length) {
      replaceByPlayerOrder(playerTables.flat())
      return
    }

    const playerMap = new Map(localTables.value
      .flatMap(table => table.seats)
      .flatMap(seat => (seat.player ? [[seat.player.value, seat.player] as const] : [])))

    localTables.value = ensureTableSeatShape(localTables.value.map((table, index) => ({
      ...table,
      seats: (playerTables[index] ?? []).map(id => ({ id: '', player: playerMap.get(id) ?? null }))
    })))
  }

  function cloneCurrentTables() {
    return ensureTableSeatShape(cloneTables(localTables.value))
  }

  function restoreTables(tables: PairingTable[]) {
    localTables.value = ensureTableSeatShape(cloneTables(tables))
  }

  // Drag can leave any arrangement; a table breaking a confirm rule is flagged on its card
  function tableStatus(table: PairingTable): TableStatus {
    if (conflictingTables.value.has(table.id)) {
      return { color: 'error' as const, label: t('tournament.single.tablePreview.status.conflict') }
    }

    const players = table.seats.filter(seat => seat.player !== null).length
    const violation = tableRuleViolations.value.get(table.id)

    if (violation === 'size') {
      return {
        color: 'warning' as const,
        label: `${players}`,
        warning: t('tournament.single.tablePreview.cardSizeWarning')
      }
    }
    if (violation === 'threeNotLast') {
      return {
        color: 'warning' as const,
        label: `${players}`,
        warning: t('tournament.single.tablePreview.cardThreeNotLastWarning')
      }
    }
    if (players === 0) return { color: 'neutral' as const, label: `${players}` }
    return { color: 'success' as const, label: `${players}` }
  }

  function addForbiddenPair(playerA: string, playerB: string) {
    if (playerA === playerB) return
    forbiddenPairs.value = normalizePairingForbiddenPairs([
      ...forbiddenPairs.value, { playerA, playerB }
    ])
  }

  function removeForbiddenPair(playerA: string, playerB: string) {
    const key = getForbiddenPairKey(playerA, playerB)
    forbiddenPairs.value = forbiddenPairs.value.filter(
      pair => getForbiddenPairKey(pair.playerA, pair.playerB) !== key
    )
  }

  function setWeights(nextWeights: Partial<PairingWeights>) {
    weights.value = { ...weights.value, ...nextWeights }
  }

  function setForbiddenPairs(nextPairs: PairingForbiddenPair[]) {
    forbiddenPairs.value = normalizePairingForbiddenPairs(nextPairs)
  }

  function runOptimizer(swapTimeBudgetMs = 120) {
    if (!playersForScoring.value.length) return false

    const result = optimizePairings({
      players: playersForScoring.value,
      history: history.value,
      leagueRematchCounts: leagueRematchCounts.value,
      forbiddenPairs: forbiddenPairs.value,
      weights: weights.value,
      currentRound: currentRound.value,
      swapTimeBudgetMs
    })

    if (!Number.isFinite(result.totalScore)) return false

    replaceByTables(result.tables)
    return true
  }

  /**
   * Reassigns every seated player to a table/seat from `seed` (same seed + players = same tables).
   */
  function randomizeTables(seed: number) {
    const shuffled = seededShuffle(localPlayerIds.value, seed)
    replaceByTables(buildPodsFromSizes(shuffled, calculatePods(shuffled.length).tableSizes))
  }

  return {
    localTables,
    isDragging,
    isValid,
    previewError,
    playerOrder,
    tableSizes,
    tableStatus,
    setDragging,
    reset,
    syncFromSource,
    normalizeLocalTables,
    updateTableSeats,
    replaceByPlayerOrder,
    cloneCurrentTables,
    restoreTables,
    runOptimizer,
    randomizeTables,
    scoreDetails,
    weights,
    forbiddenPairs,
    addForbiddenPair,
    removeForbiddenPair,
    setWeights,
    setForbiddenPairs,
    conflictingTables
  }
}
