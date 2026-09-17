<!-- app\pages\(analytics)\statistics\commanders\[commanderSlug].vue -->
<!--
  Commander detail page — ported from MagicTheGathering/league's
  pages/commander/[commanderSlug].vue (user request 2026-09-16: copy the
  decks/commanders/bracket features, adapted to this app). league links
  "decks featuring this commander" to its own per-player deck detail page
  (/player/[slug]/deck/[deckSlug]), which this app doesn't have — links to
  the player's own /players/[slug] page instead.
-->
<script setup lang="ts">
const route = useRoute()
const commanderSlug = route.params.commanderSlug as string

const { t } = useI18n()

const { data: catalogData } = useCommanderCatalogQuery()

const commanderName = computed(() => {
  const row = (catalogData.value ?? []).find(row => slugify(row.name) === commanderSlug)
  return row?.name ?? null
})

const { commander1Data: commanderData, loading: catalogLoading } = useCommanderCards(
  commanderName, undefined
)
const art = computed(() => getArtCrop(commanderData.value))

const { data: stats } = useSingleCommanderStats(commanderName)

const { data: decksFeaturing } = useDecksFeaturingCommanderQuery(commanderName)
const { data: playersData } = usePlayersQuery()

const decksWithPlayers = computed(() => {
  const name = commanderName.value
  if (!name) return []

  return (decksFeaturing.value ?? []).map((deck) => {
    const player = (playersData.value ?? []).find(p => p.uuid === deck.playerUuid)
    const isPartnerSlot = deck.commander2Name === name
    const partnerName = isPartnerSlot ? deck.commander1Name : deck.commander2Name
    const playerLabel = player ? `${player.first_name} ${player.last_name}` : null

    return {
      deckUuid: deck.uuid,
      playerSlug: playerLabel ? slugify(playerLabel) : null,
      playerLabel,
      partnerName
    }
  })
})

const scryfallSearchUrl = computed(() => commanderName.value
  ? `https://scryfall.com/search?q=!"${encodeURIComponent(commanderName.value)}"`
  : '#')

useSeoMeta({ title: () => commanderName.value ?? t('commander.breadcrumb') })
</script>

<template>
  <UDashboardPanel id="commander-detail">
    <template #header>
      <UDashboardNavbar :title="commanderName ?? t('commander.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="commanderName" class="max-w-4xl mx-auto space-y-6">
        <div class="bg-elevated rounded-xl border border-default shadow-lg overflow-hidden">
          <div class="aspect-video bg-muted">
            <ImageWithFallback
              :src="art"
              :alt="commanderName"
              :loading="catalogLoading"
            />
          </div>
          <div class="p-4 flex items-center justify-between gap-3">
            <h1 class="text-xl font-bold">
              {{ commanderName }}
            </h1>
            <MagicManaCost :mana-cost="commanderData?.manaCost" />
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <UCard
            v-for="stat in [
              { label: t('deck.statsPlayers'), value: stats?.playerCount ?? 0 },
              { label: t('player.stats.matches'), value: stats?.matchCount ?? 0 },
              { label: t('player.stats.wins'), value: stats?.winCount ?? 0 },
              { label: t('player.stats.kills'), value: stats?.totalKills ?? 0 }
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

        <ClientOnly>
          <StatisticsCommanderWinRateChart
            v-if="stats && stats.matchCount > 0"
            :wins="stats.winCount"
            :matches="stats.matchCount"
          />
        </ClientOnly>

        <div class="space-y-3">
          <h2 class="text-lg font-bold flex items-center gap-2">
            <UIcon :name="ICONS.players" class="size-5 text-primary" />
            {{ t('commander.page.decksHeading') }}
          </h2>

          <div v-if="decksWithPlayers.length" class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="entry in decksWithPlayers"
              :key="entry.deckUuid"
              :to="entry.playerSlug ? `/players/${entry.playerSlug}` : undefined"
            >
              <UBadge
                color="neutral"
                variant="soft"
                size="lg"
                class="gap-1.5"
              >
                {{ entry.playerLabel ?? t('player.fallbackName') }}
                <span v-if="entry.partnerName" class="text-muted">
                  {{ t('commander.page.partnerSuffix', { name: entry.partnerName }) }}
                </span>
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

      <EmptyState v-else :message="t('commander.page.notFound')" />
    </template>
  </UDashboardPanel>
</template>
