<!-- app\components\tournaments\single\pairing\TableScoresModal.vue -->
<!--
  "Punteggi" — read-only per-player score breakdown for one pairing, ported
  1:1 from MagicTheGathering/league's TableScoresModal.vue (icon-header
  UTable columns, user request 2026-09-19/2026-09-16). Reuses
  calculatePlayerTableScore (useCommanderScoring.ts) — the exact same
  function useLiveCommanderStandings.ts already scores every table with, so
  this can never drift from what the sidebar standings actually show.
  Deck-points column dropped vs. league — this app's ruleset has no "deck"
  scoring category (only rank/kill/brew/play, see useRulesetPointsQuery.ts).
  League's per-category "unspecified" warning highlight has no analog here:
  calculatePlayerTableScore returns null (row excluded) instead of a partial
  score, so there's nothing to flag mid-row.
-->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CellContext } from '@tanstack/vue-table'
import type { TablePlayer } from '~/types'
import {
  calculatePlayerTableScore, buildPosValues,
  type CommanderTableResult, type RulesetPointValues
} from '~/composables/tournaments/pairing/useCommanderScoring'
import { AssociateTag } from '#components'

const open = defineModel<boolean>('open', { default: false })

const {
  tableNumber, players, tableResults, ruleset
} = defineProps<{
  tableNumber: number
  players: TablePlayer[]
  tableResults: CommanderTableResult[]
  ruleset: RulesetPointValues | undefined
}>()

const { t } = useI18n()
const UIcon = resolveComponent('UIcon')

interface ScoreRow {
  name: string
  surname: string
  associateUuid?: string
  scoreRank: number
  killScore: number
  brewScore: number
  playScore: number
  totalScore: number
}

const rows = computed<ScoreRow[]>(() => {
  if (!ruleset) return []
  const posValues = buildPosValues(ruleset)
  return players
    .map((player): ScoreRow | null => {
      const scored = calculatePlayerTableScore(player.value, tableResults, posValues, ruleset)
      if (!scored) return null
      const { firstName, surname } = splitPlayerName(player.label)
      return {
        name: firstName,
        surname,
        associateUuid: player.value,
        scoreRank: scored.scoreRank,
        killScore: scored.killScore,
        brewScore: scored.brewScore,
        playScore: scored.playScore,
        totalScore: scored.totalScore
      }
    })
    .filter((row): row is ScoreRow => row !== null)
    .sort((a, b) => b.totalScore - a.totalScore)
})

function iconColumn(
  accessorKey: keyof ScoreRow, icon: string, label: string
): TableColumn<ScoreRow> {
  return {
    accessorKey,
    header: () =>
      h('div', { class: 'flex flex-col items-center gap-1' }, [
        h(UIcon, { name: icon, class: 'size-5' }),
        h('span', { class: 'text-xs' }, label)
      ]),
    cell: ({ getValue }: CellContext<ScoreRow, number>) =>
      h('span', { class: 'px-2 py-1' }, String(getValue())),
    meta: { class: { th: 'text-center', td: 'text-center px-3 py-1.5' } }
  }
}

const columns: TableColumn<ScoreRow>[] = [
  {
    accessorKey: 'name',
    header: () =>
      h('div', { class: 'flex items-center gap-2' }, [
        h(UIcon, { name: ICONS.player, class: 'size-5' }),
        h('span', t('tournament.single.roundManager.scoresModalPlayerColumn'))
      ]),
    cell: ({ row }) => h(AssociateTag, {
      name: row.original.name,
      surname: row.original.surname,
      associateUuid: row.original.associateUuid,
      size: 'xs'
    })
  },
  iconColumn('scoreRank', ICONS.standings, t('tournament.single.roundManager.rankingButton')),
  iconColumn('killScore', ICONS.kills, t('tournament.single.roundManager.killsButton')),
  iconColumn('brewScore', ICONS.brewVote, t('tournament.single.votesModal.brewLabel')),
  iconColumn('playScore', ICONS.gameplay, t('tournament.single.votesModal.playLabel')),
  {
    ...iconColumn('totalScore', ICONS.total, t('tournament.single.tablePreview.scoreBreakdown.playerTotal')),
    meta: { class: { th: 'text-center', td: 'text-center px-3 py-1.5 font-bold' } }
  }
]
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.roundManager.scoresModalTitle', { n: tableNumber })"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <UTable
        v-if="rows.length > 0"
        :data="rows"
        :columns="columns"
        :ui="{
          th: 'px-3 py-2 text-sm text-highlighted text-left font-semibold',
          td: 'px-3 py-1.5 text-sm text-muted whitespace-nowrap'
        }"
      />

      <EmptyState v-else :message="t('tournament.single.roundManager.scoresModalEmpty')" />
    </template>
  </UModal>
</template>
