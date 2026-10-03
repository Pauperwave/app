<!-- app\components\tournaments\list\Cover.vue -->
<!-- Extracted from Card.vue: the densest, most interaction-heavy block of the card (image,
     day/month chip, status dot, selection checkbox with its own shift-click capture), isolated for
     SRP.  `loading` renders a skeleton placeholder for every piece instead of a separate
     ListSkeleton.vue duplicating this markup by hand (that duplication made a standalone skeleton
     drift from this component: missed chips, wrong badge shape, wrong reserved heights). One shell,
     content swapped per element. -->
<script setup lang="ts">
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  // fallow-ignore-next-line code-duplication -- see events/list/Cover.vue
  tournament = null,
  selection,
  range = [],
  loading = false
} = defineProps<{
  tournament?: Tournament | null
  selection?: Selection<number>
  range?: number[]
  loading?: boolean
}>()

const { t } = useI18n()

// Same shift-click capture convention as TournamentsListCover.vue.
const lastClickShiftKey = ref(false)

// Single-tournament version of BulkActionsBar.vue's "Imposta immagine", both built on the shared
// MagicSetImageModal: surfaced on a card with no image yet, instead of needing a multi-select to
// add one photo. Unlike the bulk one it awaits its own mutation with a loading state and closes
// only on success (nothing else reacts to it, so no optimistic close)
const { setImage } = useTournamentsMutations()
const imageModalOpen = ref(false)

async function confirmImage(imageUrl: string, cardName: string | null, artist: string | null) {
  if (!tournament) return
  await setImage.mutateAsync({
    id: tournament.id, imageUrl, imageCardName: cardName, imageCardArtist: artist
  })
  imageModalOpen.value = false
}
</script>

<template>
  <div class="relative -m-3 mb-3">
    <template v-if="!loading && tournament">
      <!-- No `height` prop (see leagues/list/Cover.vue): height="128" with width="640" made ipx
           pre-crop the art_crop source (~1.37:1) to a 5:1 sliver before object-cover cropped it
           *again*, giving a heavily zoomed fragment. Width-only lets ipx keep the source aspect, so
           object-cover does the one matching crop. -->
      <NuxtImg
        v-if="tournament.image"
        :src="tournament.image"
        :alt="tournament.name"
        format="webp"
        width="640"
        class="w-full h-32 object-cover"
      />
      <ImageOffPlaceholder
        v-else
        class="w-full h-32"
        icon-class="size-8"
      />
    </template>
    <USkeleton v-else class="w-full h-32 rounded-none" />

    <div
      v-if="!loading && tournament"
      class="absolute top-2 left-2 flex flex-col items-center justify-center rounded-lg bg-default/90 backdrop-blur-sm border border-default w-12 h-12 shrink-0"
    >
      <span class="text-base font-bold leading-none">{{ dayPart(tournament.startDate) }}</span>
      <span class="text-[10px] uppercase text-muted">{{ monthPart(tournament.startDate) }}</span>
    </div>
    <!-- Solid black (not the default pulsing theme color) so it reads as a distinct chip on the
         cover skeleton -->
    <USkeleton
      v-else
      class="absolute top-2 left-2 w-12 h-12 rounded-lg"
      :ui="{ base: 'bg-black' }"
    />

    <!-- Bottom row: status badge (left, same edge as the date chip) and either the "set image"
         quick action or the card-art attribution chip (right), mutually exclusive (one requires the
         other missing). A single flex row with items-center instead of three absolutely-positioned
         elements: they have different natural heights (unsized badge, size="xs" button, text-[10px]
         chip), so sharing `bottom-2` didn't align their visible edges -->
    <div
      v-if="!loading && tournament"
      class="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2"
    >
      <!-- variant="solid" (opaque), not the default "subtle" (pale tint): a bg-default/90
           backdrop box like the right chip looked like a cutout around the badge's rounded
           shape; solid is legible on any photo. @click.stop because StatusChangeBadge's
           read-only branch (no manage-tournaments permission) is a plain UBadge with no click
           handler, unlike its UDropdownMenu branch, which stops propagation: otherwise clicking
           it would bubble to Card.vue's onCardClick and navigate into the detail instead of
           just showing the status -->
      <div class="shrink-0" @click.stop>
        <TournamentsStatusBadge :tournament="tournament" variant="solid" />
      </div>

      <!-- Quick "set image" action, only when there's none yet: an existing image is changed via
           EditModal like every other field -->
      <UButton
        v-if="!tournament.image"
        :label="t('tournament.bulkActions.setImage')"
        :icon="ICONS.image"
        size="xs"
        color="neutral"
        variant="solid"
        class="shrink-0"
        @click.stop="imageModalOpen = true"
      />

      <!-- Card-art attribution (required with any Scryfall art_crop use, see CardArtPicker.vue),
           only when set -->
      <CardArtCredit
        v-else-if="tournament.imageCardName"
        :card-name="tournament.imageCardName"
        :artist="tournament.imageCardArtist"
        class="min-w-0"
      />
    </div>
    <CoverFooterSkeleton v-else-if="loading" />

    <!-- Hidden until hover, except once selected (like WantedCardsListGridView.vue's card
         checkbox). `group-hover` targets the ancestor `.group` on Card.vue's UCard, unaffected by
         this component boundary. No loading counterpart: it's opacity-0 by default, so there is
         nothing to reserve space for. -->
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

    <MagicSetImageModal
      v-if="tournament"
      v-model:open="imageModalOpen"
      :title="t('tournament.bulkActions.setImageModalTitle', 1)"
      :loading="setImage.isLoading.value"
      @confirm="confirmImage"
    />
  </div>
</template>
