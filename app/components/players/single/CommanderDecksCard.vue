<!-- app\components\players\single\CommanderDecksCard.vue -->
<!-- Split out of players/[slug]/index.vue: see LoginHistoryCard.vue -->
<script setup lang="ts">
import {
  DateWithRelativeTooltip, EditIconButton, TournamentsSinglePairingCommanderDeckHover, UBadge,
  UButton, UTooltip
} from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { CommanderDeck } from '~/composables/players/useCommanderDecksQuery'

const { playerUuid, decks } = defineProps<{
  loading: boolean
  playerUuid: string | undefined
  decks: CommanderDeck[] | undefined
}>()

const { t } = useI18n()
const { data: playersData } = usePlayersQuery()

const { setBracket } = useCommanderDeckBracketMutation(() => playerUuid)
const { deleteDeck } = usePlayerDeckMutations(() => playerUuid)

const bracketModalOpen = ref(false)
const editModalOpen = ref(false)
const deleteConfirmOpen = ref(false)
const activeDeck = ref<CommanderDeck | null>(null)

function openBracketModal(deck: CommanderDeck) {
  activeDeck.value = deck
  bracketModalOpen.value = true
}

function onBracketConfirm(level: BracketLevel) {
  if (!activeDeck.value) return
  setBracket.mutate({ deckUuid: activeDeck.value.uuid, bracketLevel: level })
}

function openEditModal(deck: CommanderDeck) {
  activeDeck.value = deck
  editModalOpen.value = true
}

function requestDelete(deck: CommanderDeck) {
  activeDeck.value = deck
  deleteConfirmOpen.value = true
}

function confirmDelete() {
  if (!activeDeck.value) return
  deleteDeck.mutate({ deckUuid: activeDeck.value.uuid })
  deleteConfirmOpen.value = false
}

function lenderName(lenderUuid: string | null): string | null {
  const lender = (playersData.value ?? []).find(p => p.uuid === lenderUuid)
  return lender ? `${lender.first_name} ${lender.last_name}` : null
}

const columns: TableColumn<CommanderDeck>[] = [
  {
    // An unset bracket sorts last in both directions
    accessorFn: deck => deck.bracketLevel ?? undefined,
    id: 'bracketLevel',
    header: ({ column }) => sortableHeader(t('player.commander.decksColumns.bracket'), column),
    sortUndefined: 'last',
    cell: ({ row }) => h(UButton, {
      size: 'xs',
      variant: row.original.bracketLevel ? 'soft' : 'outline',
      color: row.original.bracketLevel ? BRACKET_COLORS[row.original.bracketLevel] : 'neutral',
      label: row.original.bracketLevel
        ? t('player.deckBracket.chipSet', {
          level: row.original.bracketLevel,
          name: t(BRACKET_LEVELS[row.original.bracketLevel - 1]!.nameKey)
        })
        : t('player.deckBracket.chipUnset'),
      onClick: () => openBracketModal(row.original)
    })
  },
  {
    accessorKey: 'commander1Name',
    header: ({ column }) => sortableHeader(t('player.commander.decksColumns.commander'), column),
    cell: ({ row }) => h(TournamentsSinglePairingCommanderDeckHover, {
      commander1Name: row.original.commander1Name
    })
  },
  {
    // The second commander slot: a partner or a background
    accessorFn: deck => deck.commander2Name ?? undefined,
    id: 'commander2Name',
    header: ({ column }) => sortableHeader(t('player.commander.decksColumns.partner'), column),
    sortUndefined: 'last',
    cell: ({ row }) => (row.original.commander2Name
      ? h(TournamentsSinglePairingCommanderDeckHover, {
        commander1Name: row.original.commander2Name
      })
      : '—')
  },
  {
    accessorFn: deck => deck.companionName ?? undefined,
    id: 'companionName',
    header: ({ column }) => sortableHeader(t('player.commander.decksColumns.companion'), column),
    sortUndefined: 'last',
    cell: ({ row }) => row.original.companionName ?? '—'
  },
  {
    accessorKey: 'tournamentsPlayed',
    header: ({ column }) => sortableHeader(t('player.commander.decksColumns.tournamentsPlayed'), column),
    meta: { class: { th: 'text-center', td: 'text-center' } }
  },
  {
    accessorKey: 'isBorrowed',
    header: t('player.commander.decksColumns.borrowed'),
    cell: ({ row }) => {
      if (!row.original.isBorrowed) return '—'
      const name = lenderName(row.original.lenderUuid)
      const label = name ? t('deck.borrowedBadge', { name }) : t('deck.borrowedUnknownLender')
      return h(UBadge, { color: 'warning', variant: 'subtle', size: 'sm' }, () => label)
    }
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => sortableHeader(t('player.commander.decksColumns.createdAt'), column),
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
  },
  {
    id: 'actions',
    header: t('player.commander.decksColumns.actions'),
    cell: ({ row }) => h('div', { class: 'flex gap-1' }, [
      h(EditIconButton, {
        label: t('deck.editModal.title'),
        size: 'xs',
        onClick: () => openEditModal(row.original)
      }),
      h(UTooltip, {
        text: row.original.tournamentsPlayed > 0
          ? t('deck.deleteInUseTooltip')
          : t('deck.deleteTooltip')
      }, () => h(UButton, {
        icon: ICONS.delete,
        size: 'xs',
        color: 'error',
        variant: 'ghost',
        ...{ 'aria-label': t('deck.deleteTooltip') },
        // A deck played in a tournament can't be deleted: the endpoint refuses it as well
        disabled: row.original.tournamentsPlayed > 0,
        onClick: () => requestDelete(row.original)
      }))
    ])
  }
]
</script>

<template>
  <UCard :ui="{ header: 'font-semibold flex items-center justify-between' }">
    <template #header>
      <span class="flex items-center gap-2">
        <UIcon :name="ICONS.commander" class="size-5 shrink-0 text-primary" />
        {{ t('player.commander.decksTitle') }}
      </span>
      <PlayersSingleDeckCreateModal v-if="playerUuid" :player-uuid="playerUuid" />
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

  <PlayersSingleBracketPickerModal
    v-model:open="bracketModalOpen"
    :deck-name="activeDeck
      ? [activeDeck.commander1Name, activeDeck.commander2Name].filter(Boolean).join(' / ')
      : ''"
    :current-level="activeDeck?.bracketLevel"
    @confirm="onBracketConfirm"
  />

  <PlayersSingleDeckEditModal v-model:open="editModalOpen" :deck="activeDeck" />

  <ConfirmModal
    v-model:open="deleteConfirmOpen"
    :title="t('deck.deleteConfirm.title')"
    :description="t('deck.deleteConfirm.description')"
    :question="t('deck.deleteConfirm.question')"
    :subject="activeDeck
      ? [activeDeck.commander1Name, activeDeck.commander2Name].filter(Boolean).join(' / ')
      : undefined"
    :warning="t('deck.deleteConfirm.warning')"
    :loading="deleteDeck.isLoading.value"
    @confirm="confirmDelete"
  />
</template>
