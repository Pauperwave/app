<!-- app\components\players\single\CommanderDecksCard.vue -->
<!-- Split out of players/[slug]/index.vue (2026-08-29, fallow:health) — see
     LoginHistoryCard.vue's own comment. -->
<script setup lang="ts">
import { DateWithRelativeTooltip } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { CommanderDeck } from '~/composables/players/useCommanderDecksQuery'

defineProps<{ loading: boolean, decks: CommanderDeck[] | undefined }>()

const { t } = useI18n()

const columns: TableColumn<CommanderDeck>[] = [
  {
    accessorKey: 'commander1Name',
    header: t('player.commander.decksColumns.commander'),
    cell: ({ row }) => [row.original.commander1Name, row.original.commander2Name]
      .filter(Boolean).join(' / ')
  },
  {
    accessorKey: 'companionName',
    header: t('player.commander.decksColumns.companion'),
    cell: ({ row }) => row.original.companionName ?? '—'
  },
  {
    accessorKey: 'createdAt',
    header: t('player.commander.decksColumns.createdAt'),
    meta: { class: { td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) =>
      h(DateWithRelativeTooltip, { isoString: row.original.createdAt, time: false })
  },
  {
    id: 'decklist',
    header: t('player.commander.decksColumns.decklist'),
    cell: ({ row }) => (row.original.decklistUrl
      ? h('a', {
        href: row.original.decklistUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'text-primary hover:underline'
      }, t('player.commander.decksColumns.openDecklist'))
      : '—')
  }
]
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      {{ t('player.commander.decksTitle') }}
    </template>

    <ListSkeleton v-if="loading" :columns="columns.length" />
    <p v-else-if="!decks?.length" class="text-sm text-muted py-4 text-center">
      {{ t('player.commander.decksEmpty') }}
    </p>
    <UTable
      v-else
      :data="decks"
      :columns="columns"
    />
  </UCard>
</template>
