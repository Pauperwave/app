<!-- app\pages\(analytics)\statistics\decks\[deckSlug].vue -->
<!-- Aggregate detail for one commander pairing, sibling to
     statistics/commanders/[commanderSlug].vue — ported from league's
     pages/deck/[deckSlug].vue (user request, 2026-09-17). Slug is
     commander1Name-based (matching league's own limitation): a commander
     paired with two different partners would collide, same as league. -->
<script setup lang="ts">
const route = useRoute()
const deckSlug = route.params.deckSlug as string

const { t } = useI18n()

const { data: pairsData } = useAllCommanderStats()
const pair = computed(() =>
  (pairsData.value ?? []).find(p => slugify(p.commander1Name) === deckSlug) ?? null)

const commander1Name = computed(() => pair.value?.commander1Name ?? null)
const commander2Name = computed(() => pair.value?.commander2Name ?? null)

const {
  commander1Data, commander2Data, catalogLoading, art1, art2, commanderDisplayName
}
  = useCommanderPairDisplay(commander1Name, commander2Name)

// Every deck (any player) that has featured commander1Name in either slot,
// filtered client-side to the exact pair (commander2Name must match too).
const { data: decksFeaturing } = useDecksFeaturingCommanderQuery(commander1Name)
const { data: playersData } = usePlayersQuery()

const decksWithPlayers = computed(() => {
  const c1 = commander1Name.value
  const c2 = commander2Name.value
  if (!c1) return []

  return (decksFeaturing.value ?? [])
    .filter(deck =>
      (deck.commander1Name === c1 && deck.commander2Name === c2)
      || (deck.commander2Name === c1 && deck.commander1Name === c2)
    )
    .map((deck) => {
      const player = (playersData.value ?? []).find(p => p.uuid === deck.playerUuid)
      const playerLabel = player ? `${player.first_name} ${player.last_name}` : null
      return {
        deckUuid: deck.uuid,
        playerSlug: playerLabel ? slugify(playerLabel) : null,
        playerLabel
      }
    })
})

useSeoMeta({ title: () => commanderDisplayName.value })
</script>

<template>
  <UDashboardPanel id="deck-detail">
    <template #header>
      <UDashboardNavbar :title="commanderDisplayName">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="pair" class="max-w-4xl mx-auto space-y-6">
        <div class="bg-elevated rounded-xl border border-default shadow-lg overflow-hidden">
          <MagicCommanderHeroImage
            :art1="art1"
            :alt1="commander1Name ?? ''"
            :art2="art2"
            :alt2="commander2Name"
            :loading="catalogLoading"
          />
          <div class="p-4 flex items-center justify-between gap-3">
            <h1 class="text-xl font-bold">
              {{ commanderDisplayName }}
            </h1>
            <div class="flex items-center gap-2">
              <MagicManaCost :mana-cost="commander1Data?.manaCost" />
              <MagicManaCost v-if="commander2Name" :mana-cost="commander2Data?.manaCost" />
            </div>
          </div>
        </div>

        <StatCardsGrid
          :stats="[
            { label: t('deck.statsPlayers'), value: pair.playerCount },
            { label: t('deck.statsMatches'), value: pair.matchCount },
            { label: t('deck.statsWins'), value: pair.winCount },
            { label: t('deck.statsKills'), value: pair.totalKills }
          ]"
        />

        <StatisticsDecksFeaturingList
          :entries="decksWithPlayers"
          :link-to="entry => entry.playerSlug
            ? `/players/${entry.playerSlug}/deck/${deckSlug}`
            : undefined"
        />

        <ScryfallSearchButton :name="commander1Name" />
      </div>

      <EmptyState v-else :message="t('deck.notFound')" />
    </template>
  </UDashboardPanel>
</template>
