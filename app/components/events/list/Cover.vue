<!-- app\components\events\list\Cover.vue -->
<!-- Events' own version of TournamentsListCover.vue: the same image/date-chip/checkbox layout,
     including the attribution chip (events have image_card_name/image_card_artist since
     migration 20260902195719), and the status badge + quick "set image" action in a single flex
     row along the bottom edge, not independently absolutely-positioned elements (their natural
     heights differ, so sharing `bottom-2` doesn't align their visible edges). -->
<script setup lang="ts">
import type { Event } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  // fallow-ignore-next-line code-duplication -- see tournaments/list/Cover.vue
  event = null,
  selection,
  range = [],
  loading = false
} = defineProps<{
  event?: Event | null
  selection?: Selection<number>
  /** The ordered list a shift-click range resolves against — see GridView.vue. */
  range?: number[]
  loading?: boolean
}>()

const { t } = useI18n()

// Same shift-click capture convention as TournamentsListCover.vue.
const lastClickShiftKey = ref(false)

// Single-event version of BulkActionsBar's "Imposta immagine", built on the shared
// MagicSetImageModal: surfaced on a card with no image yet, instead of needing a multi-select.
// Awaits its own mutation with a loading state and closes only on success
const { setImage } = useEventsMutations()
const imageModalOpen = ref(false)

async function confirmImage(imageUrl: string, cardName: string | null, artist: string | null) {
  if (!event) return
  await setImage.mutateAsync({
    id: event.id, imageUrl, imageCardName: cardName, imageCardArtist: artist
  })
  imageModalOpen.value = false
}
</script>

<template>
  <div class="relative -m-3 mb-3">
    <template v-if="!loading && event">
      <!-- No `height` prop (see leagues/list/Cover.vue): height="128" with width="640" made ipx
           pre-crop the art_crop source (~1.37:1) to a 5:1 sliver before object-cover cropped it
           *again*, giving a heavily zoomed fragment. Width-only lets ipx keep the source aspect -->
      <NuxtImg
        v-if="event.image"
        :src="event.image"
        :alt="event.name"
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
      v-if="!loading && event"
      class="absolute top-2 left-2 flex flex-col items-center justify-center rounded-lg bg-default/90 backdrop-blur-sm border border-default w-12 h-12 shrink-0"
    >
      <span class="text-base font-bold leading-none">{{ dayPart(event.startDate) }}</span>
      <span class="text-[10px] uppercase text-muted">{{ monthPart(event.startDate) }}</span>
    </div>
    <USkeleton
      v-else
      class="absolute top-2 left-2 w-12 h-12 rounded-lg"
      :ui="{ base: 'bg-black' }"
    />

    <!-- Bottom row: status badge (left, same edge as the date chip) and either the "set image"
         quick action or the card-art attribution chip (right), mutually exclusive (one requires
         the other missing) -->
    <div
      v-if="!loading && event"
      class="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2"
    >
      <!-- variant="solid": a bare subtle badge on an arbitrary photo isn't legible for every
           status color (see TournamentsListCover.vue). @click.stop because StatusChangeBadge's
           read-only branch (no manage-tournaments permission) has no click handler, unlike its
           UDropdownMenu branch: it would bubble to Card.vue's onCardClick and navigate into the
           event detail -->
      <div class="shrink-0" @click.stop>
        <EventsStatusBadge :event="event" variant="solid" />
      </div>

      <!-- Quick "set image" action, only when there's none yet: an existing image is changed
           via EditModal like every other field -->
      <UButton
        v-if="!event.image"
        :label="t('event.bulkActions.setImage')"
        :icon="ICONS.image"
        size="xs"
        color="neutral"
        variant="solid"
        class="shrink-0"
        @click.stop="imageModalOpen = true"
      />

      <!-- Card-art attribution (required with any Scryfall art_crop use, see
           CardArtPicker.vue), only when set -->
      <CardArtCredit
        v-else-if="event.imageCardName"
        :card-name="event.imageCardName"
        :artist="event.imageCardArtist"
        class="min-w-0"
      />
    </div>
    <CoverFooterSkeleton v-else-if="loading" />

    <UCheckbox
      v-if="!loading && event && selection"
      :model-value="selection.isSelected(event.id)"
      size="xl"
      class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      :class="{ 'opacity-100!': selection.isSelected(event.id) }"
      :ui="{ base: 'bg-default/90 rounded' }"
      :aria-label="t('common.selectRow')"
      @update:model-value="() => selection!.toggle(
        event.id, { shiftKey: lastClickShiftKey, range }
      )"
      @click.stop="lastClickShiftKey = $event.shiftKey"
    />

    <MagicSetImageModal
      v-if="event"
      v-model:open="imageModalOpen"
      :title="t('event.bulkActions.setImageModalTitle', 1)"
      :loading="setImage.isLoading.value"
      @confirm="confirmImage"
    />
  </div>
</template>
