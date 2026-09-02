<!-- app\components\tournaments\list\Cover.vue -->
<!--
  Extracted out of Card.vue (2026-08-16) — the densest, most interaction-heavy
  block of the card (image, day/month chip, status dot, selection checkbox
  with its own shift-click capture), isolated from the rest of the card's
  layout for SRP.

  `loading` (2026-08-22): renders a skeleton placeholder for every piece
  instead of a separate ListSkeleton.vue duplicating this markup by hand —
  that duplication was the actual root cause of a long back-and-forth
  getting a standalone skeleton to pixel-match this component (missed
  chips, wrong badge shape, wrong reserved heights). One shell, content
  swapped per element, so nothing can structurally drift again.
-->
<script setup lang="ts">
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  // fallow-ignore-next-line code-duplication -- see events/list/Cover.vue
  tournament = null, selection, range = [], loading = false
} = defineProps<{
  tournament?: Tournament | null
  selection?: Selection<number>
  range?: number[]
  loading?: boolean
}>()

const { t } = useI18n()

// Same shift-click capture convention as TournamentsListCover.vue.
const lastClickShiftKey = ref(false)

// Single-tournament version of BulkActionsBar.vue's "Imposta immagine"
// action, both built on the shared TournamentsSetImageModal — surfaced
// directly on a card with no image yet, instead of requiring a multi-select
// just to add one photo (user request, 2026-09-02). Unlike the bulk one,
// this awaits its own mutation and shows a loading state, only closing on
// success — nothing else needs to react to it, so there's no reason to fire
// the close optimistically.
const { setImage } = useTournamentsMutations()
const imageModalOpen = ref(false)

async function confirmImage(imageUrl: string, cardName: string | null, artist: string | null) {
  if (!tournament) return
  await setImage.mutateAsync({
    id: tournament.id, imageUrl, imageCardName: cardName, imageCardArtist: artist
  })
  imageModalOpen.value = false
}

function dayPart(startDate: string) {
  return new Date(startDate).toLocaleDateString('it-IT', { day: '2-digit' })
}

function monthPart(startDate: string) {
  return new Date(startDate).toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')
}
</script>

<template>
  <div class="relative -m-3 mb-3">
    <template v-if="!loading && tournament">
      <NuxtImg
        v-if="tournament.image"
        :src="tournament.image"
        :alt="tournament.name"
        format="webp"
        width="640"
        height="128"
        class="w-full h-32 object-cover"
      />
      <ImageOffPlaceholder
        v-else
        class="w-full h-32"
        icon-class="size-8"
      />
    </template>
    <USkeleton v-else class="w-full h-32 rounded-none" />

    <!-- Quick "set image" action, only when there's none yet (user request,
         2026-09-02) — an existing image is changed via EditModal instead,
         same as every other field, this is just for the common "never set
         one" case. -->
    <UButton
      v-if="!loading && tournament && !tournament.image"
      :label="t('tournament.bulkActions.setImage')"
      :icon="ICONS.image"
      size="xs"
      color="neutral"
      variant="solid"
      class="absolute inset-0 m-auto w-fit h-fit"
      @click.stop="imageModalOpen = true"
    />

    <div
      v-if="!loading && tournament"
      class="absolute top-2 left-2 flex flex-col items-center justify-center rounded-lg bg-default/90 backdrop-blur-sm border border-default w-12 h-12 shrink-0"
    >
      <span class="text-base font-bold leading-none">{{ dayPart(tournament.startDate) }}</span>
      <span class="text-[10px] uppercase text-muted">{{ monthPart(tournament.startDate) }}</span>
    </div>
    <!-- Solid black (not the default pulsing theme color) so it reads as a
         distinct chip sitting on the cover skeleton behind it. -->
    <USkeleton
      v-else
      class="absolute top-2 left-2 w-12 h-12 rounded-lg"
      :ui="{ base: 'bg-black' }"
    />

    <!-- Status badge, bottom-left of the cover (user request, 2026-09-02).
         variant="solid" (opaque fill), not the component's own default
         "subtle" (pale tint) — a wrapping bg-default/90 backdrop box like
         the date/attribution chips below turned out to look like a visible
         cutout around the badge's own already-rounded shape (user feedback);
         solid is legible directly on any photo without one. @click.stop on
         the wrapper because StatusChangeBadge's read-only branch (no
         manage-tournaments permission) is a plain UBadge with no click
         handler of its own, unlike its UDropdownMenu branch, which already
         stops propagation — without this, clicking a read-only badge would
         bubble up to Card.vue's onCardClick and navigate into the
         tournament detail instead of just showing the status. -->
    <div
      v-if="!loading && tournament"
      class="absolute bottom-2 left-2"
      @click.stop
    >
      <TournamentsStatusBadge :tournament="tournament" variant="solid" />
    </div>
    <USkeleton
      v-else-if="loading"
      class="absolute bottom-2 left-2 w-20 h-6 rounded"
      :ui="{ base: 'bg-black' }"
    />

    <!-- Card-art attribution chip (required alongside any Scryfall art_crop
         use, see CardArtPicker.vue) — only when set, so no v-else pair with
         the skeleton branch: a real card with no attribution shows neither. -->
    <UTooltip
      v-if="!loading && tournament && tournament.image && tournament.imageCardName"
      :text="tournament.imageCardArtist
        ? t('magic.cardArtPicker.attribution', {
          cardName: tournament.imageCardName, artist: tournament.imageCardArtist
        })
        : t('magic.cardArtPicker.attributionNoArtist', { cardName: tournament.imageCardName })"
    >
      <span class="absolute bottom-2 right-2 max-w-[75%] truncate rounded bg-default/90 backdrop-blur-sm px-1.5 py-0.5 text-[10px] text-muted">
        {{ tournament.imageCardName }}
      </span>
    </UTooltip>
    <USkeleton
      v-else-if="loading"
      class="absolute bottom-2 right-2 w-24 h-4 rounded"
      :ui="{ base: 'bg-black' }"
    />

    <!-- Hidden until hover, except once selected — same convention as
         WantedCardsListGridView.vue's card checkbox. `group-hover` targets
         the ancestor `.group` class on Card.vue's UCard, unaffected by this
         component boundary. No loading counterpart: it's opacity-0 by
         default anyway, so there's nothing to reserve space for. -->
    <UCheckbox
      v-if="!loading && tournament && selection"
      :model-value="selection.isSelected(tournament.id)"
      size="xl"
      class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      :class="{ 'opacity-100!': selection.isSelected(tournament.id) }"
      :ui="{ base: 'bg-default/90 rounded' }"
      :aria-label="t('common.selectRow')"
      @update:model-value="() => selection!.toggle(
        tournament.id, { shiftKey: lastClickShiftKey, range }
      )"
      @click.stop="lastClickShiftKey = $event.shiftKey"
    />

    <TournamentsSetImageModal
      v-if="tournament"
      v-model:open="imageModalOpen"
      :title="t('tournament.bulkActions.setImageModalTitle', 1)"
      :loading="setImage.isLoading.value"
      @confirm="confirmImage"
    />
  </div>
</template>
