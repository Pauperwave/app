<!-- app\components\tournaments\list\Card.vue -->
<!--
  Extracted out of GridView.vue (2026-08-16) — a single tournament's card,
  including its own context menu and selection-checkbox wiring. GridView.vue
  now only owns the grid layout and the shared `range` a shift-click resolves
  against. Cover.vue (image/date chip/status dot/checkbox) and
  LeagueLink.vue (the "tappa" text link under the title) were split out the
  same day for SRP — this file is now the orchestrator: layout + click/
  selection wiring only, no per-section rendering details.

  `loading` (2026-08-22): renders this same card's own skeleton instead of a
  separate ListSkeleton.vue duplicating its markup by hand. That duplication
  was the actual root cause of a long back-and-forth getting a standalone
  skeleton to pixel-match this component — every element here (cover, title,
  badges, footer) is written once and only its innermost content swaps
  between real and USkeleton, so nothing can structurally drift again. See
  GridView.vue's own `loading`/`loadingCount` props for how N of these get
  rendered without real tournament data.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  tournament = null, contextMenuItems, onEdit, selection, range = [], highlighted = false,
  onHoverChange, loading = false
} = defineProps<{
  tournament?: Tournament | null
  contextMenuItems?: (tournament: Tournament) => DropdownMenuItem[]
  onEdit?: (tournament: Tournament) => void
  selection?: Selection<number>
  /** The ordered list a shift-click range resolves against — see GridView.vue. */
  range?: number[]
  /**
   * Mirrors the card's own hover treatment without actually being hovered —
   * driven by GridView.vue's highlightedTournamentId, itself driven by
   * hovering the matching day in a CalendarHeatmap elsewhere on the page
   * (leagues/[leagueId]/index.vue, locations/[slug]/index.vue). @default false
   */
  highlighted?: boolean
  /**
   * The reverse direction — reports this card's own hover state upward so a
   * CalendarHeatmap elsewhere on the page can ring the matching day (user
   * request, 2026-08-20, "the other way around"). Called with the tournament
   * on hover-in, null on hover-out.
   */
  onHoverChange?: (tournament: Tournament | null) => void
  /** Renders a skeleton in place of every piece of real content — see the
   * top-of-file comment. @default false */
  loading?: boolean
}>()

const { t } = useI18n()

const isMuted = computed(() => !!tournament && (tournament.status === 'completed' || tournament.status === 'cancelled'))
const isCancelled = computed(() => tournament?.status === 'cancelled')

// Ctrl/Cmd+click or shift+click anywhere on the card toggles/range-selects
// instead of navigating — same modifier convention as a file manager, lets a
// visitor select without having to land precisely on the (small,
// hover-revealed) checkbox in Cover.vue. No-ops while loading/without a real
// tournament — nothing to click through to yet.
function onCardClick(event: MouseEvent) {
  if (!tournament) return
  if (event.ctrlKey || event.metaKey || event.shiftKey) {
    selection?.toggle(tournament.id, { shiftKey: event.shiftKey, range })
    return
  }
  navigateTo(tournamentDetailUrl(tournament))
}

function timePart(startDate: string) {
  return new Date(startDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <UContextMenu :items="!loading && tournament ? contextMenuItems!(tournament) : []">
    <UCard
      class="overflow-hidden cursor-pointer group transition-all duration-300
        hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1
        hover:scale-[1.02] hover:ring-primary"
      :class="{
        'opacity-60 saturate-50': isMuted,
        'shadow-xl shadow-primary/10 -translate-y-1 scale-[1.02] ring-primary': highlighted
      }"
      :ui="{ body: 'p-3 sm:p-3', footer: 'p-3 sm:p-3' }"
      @click="onCardClick"
      @mouseenter="tournament && onHoverChange?.(tournament)"
      @mouseleave="tournament && onHoverChange?.(null)"
    >
      <TournamentsListCover
        :tournament="tournament"
        :selection="selection"
        :range="range"
        :loading="loading"
      />

      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <template v-if="!loading && tournament">
            <h3
              class="font-semibold truncate"
              :class="{ 'line-through text-error': isCancelled }"
            >
              {{ tournament.name }}
            </h3>

            <TournamentsListLeagueLink
              :league="tournament.league"
              :league-uuid="tournament.leagueUuid"
            />
          </template>
          <!-- space-y-1, h-5/h-4: the real <h3> (no explicit text-size
               class) renders taller than a flat 16px bar, and two solid
               skeleton bars with truly zero gap between them touch
               directly — both found via live pixel measurement against
               this exact card, 2026-08-22. LeagueLink's own wrapper is a
               real fixed h-4, matched exactly since it isn't free-flowing
               text. -->
          <div v-else class="space-y-1">
            <USkeleton class="h-5 w-3/4" />
            <USkeleton class="h-4 w-1/3" />
          </div>
        </div>

        <EditIconButton
          v-if="!loading && tournament"
          :label="t('tournament.rowActions.edit')"
          size="xs"
          class="shrink-0"
          @click.stop="onEdit?.(tournament)"
        />
        <USkeleton v-else class="size-6 shrink-0" />
      </div>

      <div class="flex items-center gap-2 mt-1.5 flex-nowrap overflow-hidden">
        <template v-if="!loading && tournament">
          <BadgesFormatBadge :format="tournament.format" :icon="ICONS.gameplay" class="shrink-0" />

          <UBadge
            color="neutral"
            variant="subtle"
            :icon="ICONS.clock"
            class="shrink-0"
          >
            {{ timePart(tournament.startDate) }}
          </UBadge>

          <BadgesLocationBadge
            v-if="tournament.location"
            :location="tournament.location"
            :location-address="tournament.locationAddress"
            :maps-url="tournament.locationMapsUrl"
            class="min-w-0"
          />
        </template>
        <!-- h-6, not h-5: a real UBadge with an icon at the default "md"
             size is size-4 icon + py-1 padding = 24px tall
             (.nuxt/ui/badge.ts), not 20px — same live-measurement find. -->
        <template v-else>
          <USkeleton class="h-6 w-16" />
          <USkeleton class="h-6 w-14" />
          <USkeleton class="h-6 w-20" />
        </template>
      </div>

      <template #footer>
        <div class="flex items-center justify-between gap-2">
          <template v-if="!loading && tournament">
            <UBadge color="neutral" variant="subtle" :icon="ICONS.players">
              {{ tournament.registeredPlayers }}
            </UBadge>
            <span class="font-medium">{{ (tournament.entryFee ?? 0).toFixed(2) }} €</span>
          </template>
          <template v-else>
            <USkeleton class="h-6 w-10" />
            <USkeleton class="h-4 w-12" />
          </template>
        </div>
      </template>
    </UCard>
  </UContextMenu>
</template>
