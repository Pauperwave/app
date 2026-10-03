<!-- app\components\tournaments\list\DenseCard.vue -->
<!-- Single tile for DenseView.vue's dense grid: the same
     selection/context-menu/shift-click/navigation convention as Card.vue, in a much smaller
     tile (image + date chip + status dot + name only: the league link, format/time/location
     badges, entry fee and edit button don't fit at this size, and the full grid is one click
     away via ViewModeTabs).  `loading` mirrors Card.vue's convention: it renders this card's
     skeleton rather than a separate DenseSkeleton.vue duplicating the markup. -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  tournament = null,
  contextMenuItems,
  selection,
  range = [],
  loading = false
} = defineProps<{
  tournament?: Tournament | null
  contextMenuItems?: (tournament: Tournament) => DropdownMenuItem[]
  selection?: Selection<number>
  /** The ordered list a shift-click range resolves against — see DenseView.vue. */
  range?: number[]
  /** Renders a skeleton in place of every piece of real content. @default false */
  loading?: boolean
}>()

const { t } = useI18n()

// Same convention as Card.vue.
const {
  isMuted, isCancelled, isExternal, onCardClick
} = useTournamentCardClick({
  tournament: () => tournament, range: () => range, selection
})

const lastClickShiftKey = ref(false)
</script>

<template>
  <UContextMenu :items="!loading && tournament ? contextMenuItems!(tournament) : []">
    <UCard
      class="overflow-hidden relative group transition-all duration-300"
      :class="[
        isExternal
          ? 'cursor-default'
          : 'cursor-pointer hover:shadow-xl hover:shadow-primary/10 '
            + 'hover:-translate-y-1 hover:scale-[1.02] hover:ring-primary',
        { 'opacity-60 saturate-50': isMuted }
      ]"
      :ui="{ body: 'p-0 sm:p-0', footer: 'p-2 sm:p-2' }"
      @click="onCardClick"
    >
      <div class="relative">
        <template v-if="!loading && tournament">
          <NuxtImg
            v-if="tournament.image"
            :src="tournament.image"
            :alt="tournament.name"
            format="webp"
            width="320"
            class="w-full h-24 object-cover"
          />
          <ImageOffPlaceholder
            v-else
            class="w-full h-24"
            icon-class="size-5"
          />
        </template>
        <USkeleton v-else class="w-full h-24 rounded-none" />

        <div
          v-if="!loading && tournament"
          class="absolute top-1 left-1 flex flex-col items-center justify-center rounded bg-default/90 backdrop-blur-sm border border-default w-8 h-8 shrink-0"
        >
          <span class="text-xs font-bold leading-none">{{ dayPart(tournament.startDate) }}</span>
          <span class="text-[8px] uppercase text-muted">{{ monthPart(tournament.startDate) }}</span>
        </div>
        <USkeleton
          v-else
          class="absolute top-1 left-1 w-8 h-8 rounded"
          :ui="{ base: 'bg-black' }"
        />

        <template v-if="!loading && tournament">
          <div class="absolute bottom-1 right-1" @click.stop>
            <TournamentsStatusBadge :tournament="tournament" variant="solid" />
          </div>

          <UCheckbox
            v-if="selection"
            :model-value="selection.isSelected(tournament.id)"
            size="lg"
            class="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            :class="{ 'opacity-100!': selection.isSelected(tournament.id) }"
            :ui="{ base: 'bg-default/90 rounded' }"
            :aria-label="t('common.selectRow')"
            @update:model-value="() => selection!.toggle(
              tournament.id, { shiftKey: lastClickShiftKey, range }
            )"
            @click.stop="lastClickShiftKey = $event.shiftKey"
          />
        </template>
        <USkeleton
          v-else
          class="absolute bottom-1 right-1 w-10 h-4 rounded"
          :ui="{ base: 'bg-black' }"
        />
      </div>

      <template #footer>
        <p
          v-if="!loading && tournament"
          class="text-xs font-medium truncate"
          :class="{ 'line-through text-error': isCancelled }"
        >
          {{ tournament.name }}
          <TournamentsStageLabel v-if="tournament.stageNumber" :number="tournament.stageNumber" />
        </p>
        <USkeleton v-else class="h-3 w-20" />
      </template>
    </UCard>
  </UContextMenu>
</template>
