<!-- app\components\players\single\CommanderMatchHistoryCard.vue -->
<!-- Split out of players/[slug]/index.vue (2026-08-29, fallow:health) — see
     LoginHistoryCard.vue's own comment. -->
<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import { NuxtLink } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { CommanderMatchHistoryRow } from '~/composables/players/useCommanderMatchHistoryQuery'

defineProps<{ loading: boolean, matches: CommanderMatchHistoryRow[] | undefined }>()

const { t } = useI18n()

function formatMatchDate(startsAt: string | null): string {
  if (!startsAt) return '—'
  return format(parseISO(startsAt), 'dd/MM/yyyy')
}

const columns: TableColumn<CommanderMatchHistoryRow>[] = [
  {
    accessorKey: 'startsAt',
    header: t('player.commander.columns.date'),
    meta: { class: { td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatMatchDate(row.original.startsAt)
  },
  {
    accessorKey: 'tournamentName',
    header: t('player.commander.columns.tournament'),
    cell: ({ row }) => h(NuxtLink, {
      to: `/tournaments/${row.original.tournamentUuid}`,
      class: 'text-primary hover:underline'
    }, () => row.original.tournamentName)
  },
  {
    accessorKey: 'roundNumber',
    header: t('player.commander.columns.round'),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => row.original.roundNumber ?? '—'
  },
  {
    accessorKey: 'tableNumber',
    header: t('player.commander.columns.table'),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => row.original.tableNumber ?? '—'
  },
  {
    accessorKey: 'commanderName',
    header: t('player.commander.columns.commander'),
    cell: ({ row }) => row.original.commanderName ?? '—'
  },
  {
    accessorKey: 'position',
    header: t('player.commander.columns.position'),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => row.original.position ?? '—'
  },
  {
    accessorKey: 'kills',
    header: t('player.commander.columns.kills'),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => row.original.kills
  }
]
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      {{ t('player.commander.matchHistoryTitle') }}
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
