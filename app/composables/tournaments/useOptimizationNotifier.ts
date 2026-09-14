// app\composables\tournaments\useOptimizationNotifier.ts
// Toast feedback around the pairing optimizer's "Ottimizza"/"Risolvi
// conflitti" actions — ported from MagicTheGathering/league verbatim
// (generic, no player-identity coupling, user request 2026-09-15).
import type { Ref } from 'vue'
import type { PairingTable } from '~/types'
import type { PairingScoreDetails } from '~/composables/tournaments/pairingOptimizer'

interface ToastApi {
  add: (payload: {
    title: string
    description: string
    color?: 'success' | 'warning' | 'error' | 'neutral' | 'primary' | 'secondary' | 'info'
  }) => void
}

interface Params {
  toast: ToastApi
  isValid: Ref<boolean>
  previewError: Ref<string>
  scoreDetails: Ref<PairingScoreDetails>
  cloneCurrentTables: () => PairingTable[]
  restoreTables: (tables: PairingTable[]) => void
  runOptimizer: (swapTimeBudgetMs?: number) => boolean
}

function isCloseTo(a: number, b: number, epsilon = 0.001): boolean {
  return Math.abs(a - b) < epsilon
}

function changedTableNumbers(beforeTableTotals: number[], afterTableTotals: number[]) {
  return afterTableTotals.reduce<number[]>((acc, nextTableTotal, index) => {
    const previous = beforeTableTotals[index]
    if (previous === undefined) {
      acc.push(index + 1)
      return acc
    }

    if (!isCloseTo(nextTableTotal, previous)) {
      acc.push(index + 1)
    }

    return acc
  }, [])
}

function notifyOptimizationResult(toast: ToastApi, t: ReturnType<typeof useI18n>['t'], params: {
  changed: boolean
  beforeTotal: number
  afterTotal: number
  beforeTableTotals: number[]
  afterTableTotals: number[]
  successTitle: string
  noChangeTitle: string
}) {
  if (!params.changed || params.afterTotal <= params.beforeTotal) {
    toast.add({
      title: params.noChangeTitle,
      description: t('tournament.single.tablePreview.optimizer.noImprovements'),
      color: 'neutral'
    })
    return
  }

  const delta = params.afterTotal - params.beforeTotal
  const changedTables = changedTableNumbers(params.beforeTableTotals, params.afterTableTotals)

  toast.add({
    title: params.successTitle,
    description: t('tournament.single.tablePreview.optimizer.improvedDescription', {
      delta: delta.toFixed(2),
      tables: changedTables.join(', ') || t('tournament.single.tablePreview.optimizer.noneFallback')
    }),
    color: 'success'
  })
}

export function useOptimizationNotifier(params: Params) {
  const { t } = useI18n()

  function optimizeNow() {
    const beforeTotal = params.scoreDetails.value.totalScore
    const beforeTableTotals = params.scoreDetails.value.tableScores.map(table => table.total)

    const changed = params.runOptimizer(220)

    const afterTotal = params.scoreDetails.value.totalScore
    const afterTableTotals = params.scoreDetails.value.tableScores.map(table => table.total)

    notifyOptimizationResult(params.toast, t, {
      changed,
      beforeTotal,
      afterTotal,
      beforeTableTotals,
      afterTableTotals,
      successTitle: t('tournament.single.tablePreview.optimizer.optimizationCompleteTitle'),
      noChangeTitle: t('tournament.single.tablePreview.optimizer.alreadyOptimizedTitle')
    })
  }

  function autoResolveConflicts() {
    const snapshot = params.cloneCurrentTables()
    const beforeTotal = params.scoreDetails.value.totalScore
    const beforeTableTotals = params.scoreDetails.value.tableScores.map(table => table.total)

    const changed = params.runOptimizer(220)

    if (!params.isValid.value) {
      params.restoreTables(snapshot)
      params.toast.add({
        title: t('tournament.single.tablePreview.optimizer.conflictResolutionFailedTitle'),
        description: params.previewError.value
          || t('tournament.single.tablePreview.optimizer.noValidSolutionFallback'),
        color: 'error'
      })
      return
    }

    const afterTotal = params.scoreDetails.value.totalScore
    const afterTableTotals = params.scoreDetails.value.tableScores.map(table => table.total)

    if (afterTotal < beforeTotal) {
      params.restoreTables(snapshot)
      params.toast.add({
        title: t('tournament.single.tablePreview.optimizer.alreadyOptimizedTitle'),
        description: t('tournament.single.tablePreview.optimizer.noImprovements'),
        color: 'neutral'
      })
      return
    }

    notifyOptimizationResult(params.toast, t, {
      changed,
      beforeTotal,
      afterTotal,
      beforeTableTotals,
      afterTableTotals,
      successTitle: t('tournament.single.tablePreview.optimizer.conflictResolutionCompleteTitle'),
      noChangeTitle: t('tournament.single.tablePreview.optimizer.alreadyOptimizedTitle')
    })
  }

  return { optimizeNow, autoResolveConflicts }
}
