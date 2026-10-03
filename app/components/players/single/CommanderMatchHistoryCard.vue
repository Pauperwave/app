<!-- app\components\players\single\CommanderMatchHistoryCard.vue -->
<!-- Split out of players/[slug]/index.vue: see LoginHistoryCard.vue -->
<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import { NuxtLink, TournamentsSinglePairingCommanderDeckHover } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { CommanderMatchHistoryRow } from '~/composables/players/useCommanderMatchHistoryQuery'

defineProps<{ loading: boolean, matches: CommanderMatchHistoryRow[] | undefined }>()

const { t } = useI18n()

function formatMatchDate(startsAt: string | null): string {
  if (!startsAt) return '—'
  return format(parseISO(startsAt), 'dd/MM/yyyy')
}

// A missing round, table or position sorts last in both directions
function optionalNumber(
  accessorKey: 'roundNumber' | 'tableNumber' | 'position',
  label: string,
  icon: string
): TableColumn<CommanderMatchHistoryRow> {
  return {
    accessorFn: match => match[accessorKey] ?? undefined,
    id: accessorKey,
    header: ({ column }) => sortableHeader(label, column, icon),
    sortUndefined: 'last',
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => row.original[accessorKey] ?? '—'
  }
}

const columns: TableColumn<CommanderMatchHistoryRow>[] = [
  {
    accessorKey: 'startsAt',
    header: ({ column }) => sortableHeader(t('player.commander.columns.date'), column, ICONS.calendar),
    meta: { class: { td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatMatchDate(row.original.startsAt)
  },
  {
    accessorKey: 'tournamentName',
    header: ({ column }) => sortableHeader(t('player.commander.columns.tournament'), column, ICONS.standings),
    cell: ({ row }) => h(NuxtLink, {
      to: `/tournaments/${row.original.tournamentUuid}`,
      class: 'text-primary hover:underline'
    }, () => row.original.tournamentName)
  },
  optionalNumber('roundNumber', t('player.commander.columns.round'), ICONS.hash),
  optionalNumber('tableNumber', t('player.commander.columns.table'), ICONS.table),
  {
    accessorFn: match => match.commander1Name ?? undefined,
    id: 'commander1Name',
    header: ({ column }) => sortableHeader(t('player.commander.columns.commander'), column, ICONS.commander),
    sortUndefined: 'last',
    cell: ({ row }) => (row.original.commander1Name
      ? h(TournamentsSinglePairingCommanderDeckHover, {
        commander1Name: row.original.commander1Name,
        commander2Name: row.original.commander2Name
      })
      : '—')
  },
  optionalNumber('position', t('player.commander.columns.position'), ICONS.medal),
  {
    accessorKey: 'kills',
    header: ({ column }) => sortableHeader(t('player.commander.columns.kills'), column, ICONS.kills),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => row.original.kills
  }
]
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      <span class="flex items-center gap-2">
        <UIcon :name="ICONS.battle" class="size-5 shrink-0 text-primary" />
        {{ t('player.commander.matchHistoryTitle') }}
      </span>
    </template>

    <ListSkeleton v-if="loading" :columns="columns.length" />
    <p v-else-if="!matches?.length" class="text-sm text-muted py-4 text-center">
      {{ t('player.commander.matchHistoryEmpty') }}
    </p>
    <UTable
      v-else
      :data="matches"
      :columns="columns"
    />
  </UCard>
</template>
