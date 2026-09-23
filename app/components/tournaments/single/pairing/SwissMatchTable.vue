<!-- app\components\tournaments\single\pairing\SwissMatchTable.vue -->
<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { MatchScore, SwissMatchRow } from '~/types'

const { rows, search = '' } = defineProps<{
  rows: SwissMatchRow[]
  search?: string
}>()

const emit = defineEmits<{
  select: [pairingUuid: string, score: MatchScore]
  clear: [pairingUuid: string]
  toggleDrop: [playerUuid: string]
}>()

const { t } = useI18n()

// No initial sort: the tri-state header cycle returns to the pairings' own table order.
const sorting = ref<{ id: string, desc: boolean }[]>([])

function fullName(person: { name: string, surname?: string }): string {
  return `${person.name} ${person.surname ?? ''}`.trim()
}

// Games won minus games lost from this row's own point of view (a bye is a 2-0
// win); no result sorts last.
function resultSortKey(row: SwissMatchRow): number | undefined {
  if (row.isBye) return 2
  if (!row.current) return undefined
  const { player1GamesWon, player2GamesWon } = row.current
  return row.player.seat === 0
    ? player1GamesWon - player2GamesWon
    : player2GamesWon - player1GamesWon
}

// The drop is a row action (the same "Azioni" column the other tables use); the
// player cell only shows that it happened.
function rowActionItems(row: SwissMatchRow): DropdownMenuItem[] {
  const items: DropdownMenuItem[] = [{
    label: row.player.dropped
      ? t('tournament.single.roundManager.dropUndoLabel')
      : t('tournament.single.roundManager.dropLabel'),
    icon: ICONS.drop,
    onSelect: () => emit('toggleDrop', row.player.playerUuid)
  }]
  if (row.current) {
    items.push({
      label: t('tournament.single.roundManager.matchResultDeleteLabel'),
      icon: ICONS.undo,
      onSelect: () => emit('clear', row.pairingUuid)
    })
  }
  return items
}

// Rows still waiting for a result are tinted warning.
const tableMeta = {
  class: {
    tr: (row: { original: SwissMatchRow }) => {
      if (row.original.isBye) return ''
      return row.original.current ? 'opacity-75 transition-opacity hover:opacity-100' : 'bg-warning/10'
    }
  }
}

const columns = computed<TableColumn<SwissMatchRow>[]>(() => [
  {
    id: 'tableNumber',
    accessorFn: row => row.isBye ? undefined : row.tableNumber,
    header: ({ column }) => sortableHeader(t('tournament.single.roundManager.tableColumn'), column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    sortUndefined: 'last'
  },
  {
    id: 'player',
    accessorFn: row => fullName(row.player),
    header: ({ column }) => sortableHeader(t('tournament.single.roundManager.playerColumn'), column)
  },
  {
    id: 'opponent',
    accessorFn: row => fullName(row.player.opponent),
    header: ({ column }) => sortableHeader(t('tournament.single.roundManager.opponentColumn'), column)
  },
  {
    id: 'result',
    accessorFn: resultSortKey,
    header: ({ column }) => sortableHeader(t('tournament.single.roundManager.resultColumn'), column),
    sortUndefined: 'last'
  },
  {
    id: 'actions',
    header: t('tournament.single.roundManager.actionsColumn'),
    meta: { class: { th: 'text-center w-20', td: 'text-center' } }
  }
])
</script>

<template>
  <UTable
    v-model:sorting="sorting"
    :data="rows"
    :columns="columns"
    :meta="tableMeta"
    sticky="header"
  >
    <template #tableNumber-cell="{ row }">
      {{ row.original.isBye ? '-' : row.original.tableNumber }}
    </template>

    <template #player-cell="{ row }">
      <div class="flex items-center gap-1.5">
        <AssociateTag
          :name="row.original.player.name"
          :surname="row.original.player.surname"
          :associate-uuid="row.original.player.associateUuid"
          :highlight-query="search"
        />
        <UTooltip
          v-if="row.original.player.dropped"
          :text="t('tournament.single.roundManager.dropBadgeTooltip', {
            round: row.original.player.dropped.roundNumber,
            time: formatTimeOfDay(row.original.player.dropped.droppedAt)
          })"
        >
          <UBadge
            :label="t('tournament.single.roundManager.dropBadge', {
              round: row.original.player.dropped.roundNumber
            })"
            color="warning"
            variant="subtle"
            size="sm"
          />
        </UTooltip>
      </div>
    </template>

    <template #opponent-cell="{ row }">
      <span v-if="row.original.isBye" class="text-muted">
        {{ t('tournament.single.roundManager.byeTitle') }}
      </span>
      <AssociateTag
        v-else
        :name="row.original.player.opponent.name"
        :surname="row.original.player.opponent.surname"
        :associate-uuid="row.original.player.opponent.associateUuid"
      />
    </template>

    <template #result-cell="{ row }">
      <UBadge
        v-if="row.original.isBye"
        :label="t('tournament.single.roundManager.byeResult')"
        color="success"
        variant="subtle"
        size="lg"
      />
      <div v-else class="flex items-center gap-1.5">
        <TournamentsSinglePairingSwissMatchResultBadge
          :current="row.original.current"
          :telegram-info="row.original.telegramInfo"
          size="sm"
          :show-pending-badge="false"
          :show-delete-button="false"
        />
        <TournamentsSinglePairingSwissScoreButtons
          :seat="row.original.player.seat"
          :current="row.original.current"
          @select="score => emit('select', row.original.pairingUuid, score)"
        />
      </div>
    </template>
    <template #actions-cell="{ row }">
      <RowActionsMenu :items="rowActionItems(row.original)" />
    </template>
  </UTable>
</template>
