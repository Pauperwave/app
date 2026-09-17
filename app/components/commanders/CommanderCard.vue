<!-- app\components\commanders\CommanderCard.vue -->
<!-- Grid card for /statistics/commanders — single-commander counterpart to
     DeckCard.vue (which is pair-oriented, for /statistics/decks). Reads
     from the same aggregated row commanders/index.vue's table already
     builds (catalog art/mana cost + commander_stats totals), no extra
     query of its own. -->
<script setup lang="ts">
interface CommanderCardRow {
  name: string
  manaCost: string | null
  artCropUrl: string | null
  playerCount: number
  matchCount: number
}

const { row, loading = false } = defineProps<{
  row: CommanderCardRow
  loading?: boolean
}>()

const { t } = useI18n()

const commanderSlug = computed(() => slugify(row.name))
</script>

<template>
  <UCard
    class="overflow-hidden hover:shadow-lg transition-shadow"
    :ui="{ body: 'p-0 sm:p-0', footer: 'px-3 py-2' }"
  >
    <template #header>
      <div class="flex items-center justify-end gap-2">
        <UBadge
          v-if="row.playerCount > 0"
          variant="soft"
          color="info"
          class="flex items-center gap-1"
        >
          <UIcon :name="ICONS.players" class="size-3" />
          {{ row.playerCount }}
        </UBadge>
        <UBadge
          v-if="row.matchCount > 0"
          variant="soft"
          color="primary"
          class="flex items-center gap-1"
        >
          <UIcon :name="ICONS.battle" class="size-3" />
          {{ row.matchCount }}
        </UBadge>
      </div>
    </template>

    <div class="aspect-4/3">
      <TournamentsSinglePairingCommanderArt
        :card-name="row.name"
        :art-url="row.artCropUrl"
        :mana-cost="row.manaCost ?? undefined"
        :loading="loading"
      />
    </div>

    <template #footer>
      <UButton
        size="xs"
        variant="soft"
        color="primary"
        :icon="ICONS.deckStats"
        :to="`/statistics/commanders/${commanderSlug}`"
        class="w-full justify-center"
      >
        {{ t('deck.viewDetails') }}
      </UButton>
    </template>
  </UCard>
</template>
