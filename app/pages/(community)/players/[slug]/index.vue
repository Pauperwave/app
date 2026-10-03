<!-- app\pages\(community)\players\[slug]\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- see the same comment in leagues/[leagueId]/index.vue
// Detail page for players, shaped like associate/[slug].vue (avatar header card + DetailCard grid).
// No edit action: players have no editing UI anywhere, they derive from their associate record.
// Slug-based, not uuid: the display name is first_name+last_name, exactly as stable as
// associate/[slug].vue's slug. The route is gated like players/index.vue (it used to be nav-hidden
// only)
definePageMeta({ permission: 'view-players' })

interface DetailField {
  icon: string
  label: string
  value: string
}

const { t } = useI18n()
const route = useRoute()

const { data: playersData, isLoading: playerLoading } = usePlayersQuery()
const player = computed(() => playersData.value?.find(
  item => slugify(`${item.first_name} ${item.last_name}`) === route.params.slug) ?? null)

// first_name + last_name: the same display name as the associate this player derives from
const displayName = computed(() => player.value
  ? `${player.value.first_name} ${player.value.last_name}`
  : '')

const avatar = computed(() =>
  (displayName.value ? generatePlayerAvatar(displayName.value) : undefined))

useSeoMeta({ title: () => displayName.value || t('player.breadcrumb') })

// No override needed — the slug itself formats fine via useBreadcrumbs.ts's
// own hyphen-split+title-case fallback, same as associate/[slug].vue.
const { breadcrumbItems } = useBreadcrumbs()

// "Profilo" points at the associate record behind this player — same
// reasoning as LayoutUserMenu.vue's own profileLink, and the reverse
// direction of associate/[slug].vue's own "Vedi il profilo giocatore" link.
const associateLink = computed(() => (player.value?.first_name && player.value?.last_name)
  ? `/associate/${slugify(`${player.value.first_name} ${player.value.last_name}`)}`
  : null)

const { data: lastLoginsData, isLoading: lastLoginsLoading } = usePlayersLastLoginsQuery()
const lastSignInAt = computed(() => lastLoginsData.value
  ?.find(entry => entry.playerUuid === player.value?.uuid)?.lastSignInAt ?? null)

const infoFields = computed<DetailField[]>(() => !player.value
  ? []
  : [
    ...(player.value.pauperwave_associate_number
      ? [{
        icon: ICONS.idCard,
        label: t('player.columns.pauperwaveAssociateNumber'),
        value: player.value.pauperwave_associate_number
      }]
      : []),
    ...(player.value.email_address
      ? [{ icon: ICONS.mail, label: t('player.columns.emailAddress'), value: player.value.email_address }]
      : [])
  ])

// Backed by the trigger-populated player_login_history table (migration
// 20260820100000), not the admin-API-backed last-logins.get.ts above — see
// usePlayerLoginHistoryQuery.ts's own comment on why these two are separate.
const userId = computed(() => player.value?.user_id)
const { data: loginHistory, isLoading: loginHistoryLoading } = usePlayerLoginHistoryQuery(userId)

const loading = computed(() => playerLoading.value || lastLoginsLoading.value)

// "Storico Partite" + "Mazzi Commander", shown for every player, not just Commander regulars: there
// is no "plays Commander" flag to gate on, and an empty state is an honest result for a player who
// only played other formats
const playerUuid = computed(() => player.value?.uuid ?? undefined)
const { data: matchHistory, isLoading: matchHistoryLoading }
  = useCommanderMatchHistoryQuery(playerUuid)
const { data: commanderDecks, isLoading: commanderDecksLoading }
  = useCommanderDecksQuery(playerUuid)
</script>

<template>
  <UDashboardPanel id="player">
    <template #header>
      <UDashboardNavbar :title="displayName || $t('player.detail.navbarTitle')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon :name="ICONS.loading" class="animate-spin text-3xl text-muted" />
      </div>

      <EmptyState
        v-else-if="!player"
        :message="t('player.detail.notFound')"
      />

      <div v-else class="flex flex-col gap-4">
        <UCard>
          <div class="flex flex-wrap items-center gap-4">
            <UAvatar
              :src="avatar"
              :alt="displayName"
              size="3xl"
              :ui="{ root: 'size-24', fallback: 'text-2xl' }"
            />
            <div class="flex-1 min-w-0">
              <h2 class="text-xl font-semibold truncate">
                {{ displayName }}
              </h2>
              <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                <UBadge :color="player.is_active ? 'success' : 'neutral'" variant="subtle">
                  {{ player.is_active ? t('player.tabs.active') : t('player.tabs.inactive') }}
                </UBadge>
              </div>

              <NuxtLink
                v-if="associateLink"
                :to="associateLink"
                class="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1.5"
              >
                <UIcon :name="ICONS.player" class="size-4" />
                {{ t('player.detail.viewAssociateProfile') }}
              </NuxtLink>
            </div>
          </div>
        </UCard>

        <div class="grid gap-4 sm:grid-cols-2">
          <DetailCard
            :title="t('player.detail.sections.info')"
            :icon="ICONS.info"
            :fields="infoFields"
          >
            <template #before>
              <div class="flex justify-between items-center gap-4">
                <dt class="flex items-center gap-1.5 text-muted">
                  <UIcon :name="ICONS.calendar" class="size-4 shrink-0" />
                  {{ t('player.columns.createdAt') }}
                </dt>
                <dd>
                  <DateWithRelativeTooltip :iso-string="player.created_at" :time="false" />
                </dd>
              </div>
              <div class="flex justify-between items-center gap-4">
                <dt class="flex items-center gap-1.5 text-muted">
                  <UIcon :name="ICONS.clock" class="size-4 shrink-0" />
                  {{ t('player.columns.lastLogin') }}
                </dt>
                <dd>
                  <DateWithRelativeTooltip v-if="lastSignInAt" :iso-string="lastSignInAt" />
                  <span v-else class="text-dimmed">{{ t('player.neverLoggedIn') }}</span>
                </dd>
              </div>
            </template>
          </DetailCard>
        </div>

        <PlayersSingleLoginHistoryCard
          v-if="player.user_id"
          :loading="loginHistoryLoading"
          :dates="loginHistory"
        />

        <PlayersSingleCommanderMatchHistoryCard
          :loading="matchHistoryLoading"
          :matches="matchHistory"
        />

        <PlayersSingleCommanderDecksCard
          :loading="commanderDecksLoading"
          :player-uuid="playerUuid"
          :decks="commanderDecks"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
