<!-- app\components\leagues\list\Card.vue -->
<!--
  Leagues' own version of TournamentsListCard.vue (2026-08-16, "make the
  leagues cards match the tournaments cards") — same cover/checkbox/edit
  layout and hover treatment, adapted to League's fields: a ruleset badge
  instead of format/location, a tournament-progress bar instead of
  players/entry-fee (leagues have neither). Status shows through the card's
  own styling rather than a badge, same convention as Card.vue: completed
  and cancelled both recede via opacity/saturation (2026-08-16: cancelled
  used to keep full brightness, only the strikethrough+error title signaled
  it — too easy to miss at a glance in a grid), cancelled additionally gets
  the strikethrough+error title to stay distinct from "finished
  successfully".

  `loading` (2026-08-22): same per-element real-vs-USkeleton branching as
  TournamentsListCard.vue — see that file's own comment for why this
  replaces a separate hand-duplicated skeleton.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { League } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  league = null, contextMenuItems, onEdit, selection, range = [], loading = false
} = defineProps<{
  league?: League | null
  contextMenuItems?: (league: League) => DropdownMenuItem[]
  onEdit?: (league: League) => void
  selection?: Selection<number>
  /** The ordered list a shift-click range resolves against — see GridView.vue. */
  range?: number[]
  loading?: boolean
}>()

const { t } = useI18n()

const isMuted = computed(() => !!league && (league.status === 'completed' || league.status === 'cancelled'))
const isCancelled = computed(() => league?.status === 'cancelled')

// Same ctrl/cmd/shift-click convention as TournamentsListCard.vue. No-ops
// while loading/without a real league — nothing to click through to yet.
function onCardClick(event: MouseEvent) {
  if (!league) return
  if (event.ctrlKey || event.metaKey || event.shiftKey) {
    selection?.toggle(league.id, { shiftKey: event.shiftKey, range })
    return
  }
  navigateTo(`/leagues/${league.uuid}`)
}

function progress(current: League) {
  if (!current.tournamentCount) return 0
  return Math.round((current.completedTournamentCount / current.tournamentCount) * 100)
}

function longDate(isoString: string) {
  const date = new Date(isoString)
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })
}

// User request, 2026-08-22: the card should show both ends of the league's
// span, not just the start (previously only discoverable via the cover
// chip's hover tooltip — see LeaguesListCover.vue), with months spelled
// out in full rather than abbreviated. Falls back to the league's own
// startDate with no end half when it has no tournaments yet, same
// "Dal X al Y" phrasing already used by LeaguesSinglePresentationCard.vue,
// just without the year to keep it to one line on a grid card.
const dateRangeLabel = computed(() => {
  if (!league) return ''
  const range = league.tournamentDateRange
  if (!range || range.start === range.end) {
    const singleDate = range?.start ?? league.startDate
    return `${t('league.detail.dateRange.from')} ${longDate(singleDate)}`
  }
  return t('league.detail.dateRange.tooltip', {
    start: longDate(range.start), end: longDate(range.end)
  })
})

// Capped at 2 badges + a "+N" overflow one (ADR, docs/PROGRESS.md,
// 2026-08-22) — a league can span several formats over its lifetime, and
// this row already shares space with the ruleset badge, unlike tournaments'
// own single-format badge.
const MAX_VISIBLE_FORMATS = 2
const visibleFormats = computed(() => league?.tournamentFormats.slice(0, MAX_VISIBLE_FORMATS) ?? [])
const extraFormatCount = computed(() =>
  Math.max(0, (league?.tournamentFormats.length ?? 0) - MAX_VISIBLE_FORMATS))
</script>

<template>
  <UContextMenu :items="!loading && league ? contextMenuItems!(league) : []">
    <UCard
      class="overflow-hidden cursor-pointer group transition-all duration-300
        hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1
        hover:scale-[1.02] hover:ring-primary"
      :class="{ 'opacity-60 saturate-50': isMuted }"
      :ui="{
        body: 'p-3 sm:p-3',
        footer: 'p-3 sm:p-3'
      }"
      @click="onCardClick"
    >
      <LeaguesListCover
        :league="league"
        :selection="selection"
        :range="range"
        :loading="loading"
      />

      <div class="flex items-start justify-between gap-2">
        <h3
          v-if="!loading && league"
          class="font-semibold truncate min-w-0"
          :class="{ 'line-through text-error': isCancelled }"
        >
          {{ league.name }}
        </h3>
        <!-- Width matches "Lega Invernale 2026" — see TournamentsListCard.vue's
             own comment for why these are sized to real content, not
             arbitrary bars. -->
        <USkeleton v-else class="h-5 w-32 min-w-0" />

        <EditIconButton
          v-if="!loading && league"
          :label="t('league.rowActions.edit')"
          size="xs"
          class="shrink-0"
          @click.stop="onEdit?.(league)"
        />
        <USkeleton v-else class="size-6 shrink-0" />
      </div>

      <p v-if="!loading && league" class="text-sm text-muted truncate mt-0.5">
        {{ dateRangeLabel }}
      </p>
      <!-- Width matches "Dal 01 agosto al 22 maggio". -->
      <USkeleton v-else class="h-4 w-40 mt-0.5" />

      <div class="flex items-center gap-2 mt-1.5 flex-nowrap overflow-hidden">
        <template v-if="!loading && league">
          <BadgesFormatBadge
            v-for="format in visibleFormats"
            :key="format"
            :format="format"
            :icon="ICONS.gameplay"
            class="shrink-0"
          />
          <UBadge
            v-if="extraFormatCount"
            color="neutral"
            variant="subtle"
            class="shrink-0"
          >
            +{{ extraFormatCount }}
          </UBadge>
          <LeaguesRulesetBadge :league="league" />
        </template>
        <!-- Widths match "Commander" (format) + "Pauper" (ruleset). Always
             shown while loading (not conditional on real data) since
             LeaguesRulesetBadge itself always renders now too — see its
             own comment for why the badge row can't collapse. -->
        <template v-else>
          <USkeleton class="h-6 w-24" />
          <USkeleton class="h-6 w-20" />
        </template>
      </div>

      <template #footer>
        <div v-if="!loading && league" class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-sm text-muted">
            <span>{{ t('league.tournamentsLabel') }}</span>
            <span>{{ t('league.progress', {
              completed: league.completedTournamentCount, total: league.tournamentCount
            }) }}</span>
          </div>
          <UProgress :model-value="progress(league)" size="sm" />
        </div>
        <div v-else class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-4 w-12" />
          </div>
          <USkeleton class="h-2 w-full" />
        </div>
      </template>
    </UCard>
  </UContextMenu>
</template>
