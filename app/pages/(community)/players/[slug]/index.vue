<!-- app\pages\(community)\players\[slug]\index.vue -->
<script lang="ts" setup>
// Detail page for players (2026-08-20 user request) — restructured the same
// day to match associate/[slug].vue's own shape (avatar header card +
// DetailCard grid) instead of the ad-hoc <dl> this started as. No edit
// action here: players have no editing UI anywhere in the app today, they're
// derived from their associate record. Slug-based, not uuid (also
// 2026-08-20, reversing the original uuid choice) — now that the display
// name is first_name+last_name (not the mutable, non-unique nickname), it's
// exactly as stable as associate/[slug].vue's own slug, so there's no reason
// for this one route pair to be the odd one out.
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

// first_name + last_name, not nickname — same display name as the associate
// this player is derived from (user request, 2026-08-20). Nickname shows as
// its own field below instead.
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
    ...(player.value.nickname
      ? [{ icon: ICONS.player, label: t('player.columns.nickname'), value: player.value.nickname }]
      : []),
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
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else-if="!player" class="text-center py-12 text-muted">
        {{ t('player.detail.notFound') }}
      </div>

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
          <DetailCard :title="t('player.detail.sections.info')" :fields="infoFields">
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

        <UCard v-if="player.user_id" :ui="{ header: 'font-semibold' }">
          <template #header>
            {{ t('player.detail.loginHistory') }}
          </template>

          <div v-if="loginHistoryLoading" class="flex items-center justify-center py-8">
            <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
          </div>

          <template v-else-if="!loginHistory?.length">
            <div class="text-center py-8 text-muted">
              {{ t('player.detail.loginHistoryEmpty') }}
            </div>
          </template>

          <template v-else>
            <div class="flex justify-center">
              <CalendarHeatmap :dates="loginHistory" />
            </div>
          </template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
