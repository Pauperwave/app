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

const { commander1Data, commander2Data, loading: catalogLoading } = useCommanderCards(
  commander1Name, commander2Name
)
const art1 = computed(() => getArtCrop(commander1Data.value))
const art2 = computed(() => getArtCrop(commander2Data.value))

const commanderDisplayName = computed(() => [commander1Name.value, commander2Name.value]
  .filter(Boolean).join(' / ') || t('deck.fallbackName'))

const scryfallSearchUrl = computed(() => commander1Name.value
  ? `https://scryfall.com/search?q=!"${encodeURIComponent(commander1Name.value)}"`
  : '#')

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
          <div class="aspect-video bg-muted" :class="commander2Name ? 'flex' : ''">
            <ImageWithFallback
              :src="art1"
              :alt="commander1Name ?? ''"
              :loading="catalogLoading"
              :class="commander2Name ? 'flex-1' : ''"
            />
            <ImageWithFallback
              v-if="commander2Name"
              :src="art2"
              :alt="commander2Name"
              :loading="catalogLoading"
              class="flex-1"
            />
          </div>
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

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <UCard
            v-for="stat in [
              { label: t('deck.statsPlayers'), value: pair.playerCount },
              { label: t('deck.statsMatches'), value: pair.matchCount },
              { label: t('deck.statsWins'), value: pair.winCount },
              { label: t('deck.statsKills'), value: pair.totalKills }
            ]"
            :key="stat.label"
          >
            <p class="text-xs text-muted uppercase mb-1">
              {{ stat.label }}
            </p>
            <p class="text-2xl font-semibold">
              {{ stat.value }}
            </p>
          </UCard>
        </div>

        <div class="space-y-3">
          <h2 class="text-lg font-bold flex items-center gap-2">
            <UIcon :name="ICONS.players" class="size-5 text-primary" />
            {{ t('commander.page.decksHeading') }}
          </h2>

          <div v-if="decksWithPlayers.length" class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="entry in decksWithPlayers"
              :key="entry.deckUuid"
              :to="entry.playerSlug ? `/players/${entry.playerSlug}/deck/${deckSlug}` : undefined"
            >
              <UBadge
                color="neutral"
                variant="soft"
                size="lg"
              >
                {{ entry.playerLabel ?? t('player.fallbackName') }}
              </UBadge>
            </NuxtLink>
          </div>
          <EmptyState v-else :message="t('commander.index.emptyList')" />
        </div>

        <UButton
          :label="t('deck.viewOnScryfall')"
          :icon="ICONS.externalLink"
          variant="outline"
          color="neutral"
          :to="scryfallSearchUrl"
          target="_blank"
        />
      </div>

      <EmptyState v-else :message="t('deck.notFound')" />
    </template>
  </UDashboardPanel>
</template>
