<!-- app\components\commanders\DeckDenseCard.vue -->
<!-- Dense grid tile for /statistics/decks (third view mode alongside
     grid/table) — single-art thumbnail + combined name only, full detail
     one click away via DeckCard.vue's own grid view. `pair` optional +
     `loading` mirrors TournamentsListDenseCard.vue's convention: renders
     this same tile's skeleton in place, not a separate skeleton component. -->
<script setup lang="ts">
import type { CommanderStatsPair } from '~/composables/commanders/useCommanderStatsQuery'

const { pair = null, loading = false } = defineProps<{
  pair?: CommanderStatsPair | null
  loading?: boolean
}>()

const { commander1Data, loading: artLoading } = useCommanderCards(
  () => pair?.commander1Name, () => null
)
const art1 = computed(() => getArtCrop(commander1Data.value))
const deckSlug = computed(() => pair ? slugify(pair.commander1Name) : '')
const displayName = computed(() => pair
  ? [pair.commander1Name, pair.commander2Name].filter(Boolean).join(' / ')
  : '')
</script>

<template>
  <NuxtLink v-if="!loading && pair" :to="`/statistics/decks/${deckSlug}`">
    <UCard
      class="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <div class="aspect-square">
        <TournamentsSinglePairingCommanderArt
          :card-name="displayName"
          :art-url="art1"
          :loading="artLoading"
          size="sm"
        />
      </div>
    </UCard>
  </NuxtLink>

  <UCard
    v-else
    class="overflow-hidden"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <USkeleton class="aspect-square w-full" />
  </UCard>
</template>
