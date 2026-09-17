<!-- app\pages\(community)\players\[slug]\deck\[deckSlug].vue -->
<!-- Per-player-per-deck-instance view — ported from league's
     pages/player/[slug]/deck/[deckSlug].vue (user request, 2026-09-17), but
     simpler: this app's tournament_round_results links to a specific
     commander_decks.uuid row, so stats stay correctly scoped to this exact
     deck instance without needing a separate deck_stats view (see
     useCommanderDeckStatsQuery.ts). -->
<script setup lang="ts">
definePageMeta({ permission: 'view-players' })

const route = useRoute()
const { t } = useI18n()

const { data: playersData } = usePlayersQuery()
const player = computed(() => playersData.value?.find(
  item => slugify(`${item.first_name} ${item.last_name}`) === route.params.slug) ?? null)

const displayName = computed(() => player.value ? `${player.value.first_name} ${player.value.last_name}` : '')

const { data: decksData, isLoading: decksLoading } = useCommanderDecksQuery(
  () => player.value?.uuid ?? undefined
)
const deck = computed(() => decksData.value?.find(
  d => slugify(d.commander1Name) === route.params.deckSlug) ?? null)

const commander1Name = computed(() => deck.value?.commander1Name ?? null)
const commander2Name = computed(() => deck.value?.commander2Name ?? null)

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

const { data: stats } = useCommanderDeckStatsQuery(() => deck.value?.uuid)
const { data: playersFullData } = usePlayersQuery()
const lenderName = computed(() => {
  if (!deck.value?.isBorrowed || !deck.value.lenderUuid) return null
  const lender = (playersFullData.value ?? []).find(p => p.uuid === deck.value?.lenderUuid)
  return lender ? `${lender.first_name} ${lender.last_name}` : null
})

useSeoMeta({ title: () => commanderDisplayName.value })
const { breadcrumbItems } = useBreadcrumbs()
</script>

<template>
  <UDashboardPanel id="player-deck-detail">
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
      <div v-if="deck" class="max-w-4xl mx-auto space-y-6">
        <UBreadcrumb :items="breadcrumbItems" class="mb-2" />

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
          <div class="p-4 space-y-2">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h1 class="text-xl font-bold">
                  {{ commanderDisplayName }}
                </h1>
                <p class="text-sm text-muted">
                  {{ displayName }}
                </p>
              </div>
              <MagicManaCost :mana-cost="commander1Data?.manaCost" />
            </div>
            <p v-if="deck.companionName" class="text-sm text-muted flex items-center gap-1.5">
              <UIcon :name="ICONS.gameplay" class="size-3.5" />
              {{ deck.companionName }}
            </p>
            <UBadge
              v-if="deck.isBorrowed"
              color="warning"
              variant="subtle"
            >
              {{
                lenderName
                  ? t('deck.borrowedBadge', { name: lenderName })
                  : t('deck.borrowedUnknownLender')
              }}
            </UBadge>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <UCard
            v-for="stat in [
              { label: t('deck.statsMatches'), value: stats?.matchCount ?? 0 },
              { label: t('deck.statsWins'), value: stats?.winCount ?? 0 },
              { label: t('deck.statsKills'), value: stats?.totalKills ?? 0 },
              { label: t('player.stats.average'), value: stats?.averageScore ?? 0 }
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

        <UButton
          :label="t('deck.viewOnScryfall')"
          :icon="ICONS.externalLink"
          variant="outline"
          color="neutral"
          :to="scryfallSearchUrl"
          target="_blank"
        />
      </div>

      <EmptyState v-else-if="!decksLoading" :message="t('deck.notFound')" />
    </template>
  </UDashboardPanel>
</template>
