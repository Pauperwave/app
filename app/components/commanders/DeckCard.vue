<!-- app\components\commanders\DeckCard.vue -->
<!-- Grid card for /statistics/decks (the deck-pairing browsing hub), ported
     from league's CommanderDeckCard.vue's aggregate-mode branch (user
     request, 2026-09-17) — this app has no per-deck-row browsing table, so
     it's driven by a CommanderStatsPair (the commander_stats view) rather
     than a raw commander_decks row. Player-specific deck display stays in
     CommanderDecksCard.vue's own table. -->
<script setup lang="ts">
import type { CommanderStatsPair } from '~/composables/commanders/useCommanderStatsQuery'

const { pair } = defineProps<{ pair: CommanderStatsPair }>()

const { t } = useI18n()

const { commander1Data, commander2Data, loading } = useCommanderCards(
  () => pair.commander1Name,
  () => pair.commander2Name
)

const art1 = computed(() => getArtCrop(commander1Data.value))
const art2 = computed(() => getArtCrop(commander2Data.value))

const deckSlug = computed(() => slugify(pair.commander1Name))
</script>

<template>
  <UCard class="overflow-hidden hover:shadow-lg transition-shadow" :ui="{ body: 'p-0 sm:p-0', footer: 'px-3 py-2' }">
    <template #header>
      <div class="flex items-center justify-end gap-2">
        <UBadge
          v-if="pair.playerCount > 0"
          variant="soft"
          color="info"
          class="flex items-center gap-1"
        >
          <UIcon :name="ICONS.players" class="size-3" />
          {{ pair.playerCount }}
        </UBadge>
        <UBadge
          v-if="pair.matchCount > 0"
          variant="soft"
          color="primary"
          class="flex items-center gap-1"
        >
          <UIcon :name="ICONS.battle" class="size-3" />
          {{ pair.matchCount }}
        </UBadge>
      </div>
    </template>

    <div class="aspect-4/3" :class="pair.commander2Name ? 'flex flex-col' : ''">
      <TournamentsSinglePairingCommanderArt
        :card-name="pair.commander1Name"
        :art-url="art1"
        :mana-cost="commander1Data?.manaCost ?? undefined"
        :loading="loading"
        :class="pair.commander2Name ? 'flex-1 min-h-0' : ''"
      />
      <TournamentsSinglePairingCommanderArt
        v-if="pair.commander2Name"
        :card-name="pair.commander2Name"
        :art-url="art2"
        :mana-cost="commander2Data?.manaCost ?? undefined"
        :loading="loading"
        class="flex-1 min-h-0"
      />
    </div>

    <template #footer>
      <UButton
        size="xs"
        variant="soft"
        color="primary"
        :icon="ICONS.deckStats"
        :to="`/statistics/decks/${deckSlug}`"
        class="w-full justify-center"
      >
        {{ t('deck.viewDetails') }}
      </UButton>
    </template>
  </UCard>
</template>
