<!-- app\components\leagues\list\Card.vue -->
<!-- Leagues' own version of TournamentsListCard.vue: the same cover/checkbox/edit layout and
     hover treatment, adapted to League's fields (a ruleset badge instead of format/location, a
     tournament-progress bar instead of players/entry-fee). Status shows through the card's
     styling rather than a badge, like Card.vue: completed and cancelled both recede via
     opacity/saturation, cancelled also gets the strikethrough+error title to stay distinct from
     "finished successfully".  `loading`: the same per-element real-vs-USkeleton branching as
     TournamentsListCard.vue (see its comment for why this replaces a separate hand-duplicated
     skeleton). -->
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

// Same ctrl/cmd/shift-click convention as TournamentsListCard.vue; no-ops while loading/without a
// real league (nothing to click through to)
function onCardClick(event: MouseEvent) {
  if (!league) return
  if (event.ctrlKey || event.metaKey || event.shiftKey) {
    selection?.toggle(league.id, { shiftKey: event.shiftKey, range })
    return
  }
  navigateTo(`/leagues/${league.uuid}`)
}

// `includeYear` only matters when the range ends fall in different years ("Lega Estiva 2026" runs
// 30 luglio 2026 → 20 gennaio 2027): the year on the end date alone would suggest the start is also
// 2027
function longDate(isoString: string, includeYear: boolean) {
  const date = new Date(isoString)
  return date.toLocaleDateString('it-IT', includeYear
    ? { day: '2-digit', month: 'long', year: 'numeric' }
    : { day: '2-digit', month: 'long' })
}

// Shows both ends of the league's span (not just the start, which was only in the cover chip's
// tooltip, see LeaguesListCover.vue), months in full and the year at the end. Falls back to the
// league's startDate with no end half when it has no tournaments yet, with the "Dal X al Y"
// phrasing of LeaguesSinglePresentationCard.vue
const dateRangeLabel = computed(() => {
  if (!league) return ''
  const range = league.tournamentDateRange
  if (!range || range.start === range.end) {
    const singleDate = range?.start ?? league.startDate
    return `${t('league.detail.dateRange.from')} ${longDate(singleDate, true)}`
  }
  const sameYear = new Date(range.start).getFullYear() === new Date(range.end).getFullYear()
  return t('league.detail.dateRange.tooltip', {
    start: longDate(range.start, !sameYear), end: longDate(range.end, true)
  })
})

// Capped at 2 badges + a "+N" overflow one (ADR, docs/PROGRESS.md): a league can span several
// formats over its lifetime, and this row shares space with the ruleset badge, unlike tournaments'
// single-format badge
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
        <!-- Width matches "Lega Invernale 2026" (see TournamentsListCard.vue: sized to real
             content, not arbitrary bars) -->
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
      <!-- Width matches "Dal 01 agosto al 22 maggio 2026". -->
      <USkeleton v-else class="h-4 w-48 mt-0.5" />

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
        <!-- Widths match "Commander" (format) + "Pauper" (ruleset). Always shown while loading,
             since LeaguesRulesetBadge always renders too (see its comment on why the row can't
             collapse) -->
        <template v-else>
          <USkeleton class="h-6 w-24" />
          <USkeleton class="h-6 w-20" />
        </template>
      </div>

      <template #footer>
        <LeaguesLeagueTournamentsProgress v-if="!loading && league" :league="league" />
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
