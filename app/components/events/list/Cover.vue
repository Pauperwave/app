<!-- app\components\events\list\Cover.vue -->
<!--
  Events' own version of TournamentsListCover.vue (2026-08-22, issue #45 +
  "make presentable /events") — same image/date-chip/checkbox layout,
  including the attribution chip since migration 20260902195719 added
  image_card_name/image_card_artist to events (previously events had
  neither column — user request, 2026-09-02, "reuse the same UI
  tournaments already has").

  Status badge + quick "set image" action (2026-09-02, same treatment as
  TournamentsListCover.vue) — single flex row along the bottom edge, not
  independently absolutely-positioned elements (badge/button/chip have
  different natural heights, sharing only `bottom-2` doesn't put their
  visible edges on the same line).
-->
<script setup lang="ts">
import type { Event } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  // fallow-ignore-next-line code-duplication -- see tournaments/list/Cover.vue
  event = null, selection, range = [], loading = false
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

// Single-event version of BulkActionsBar's "Imposta immagine" action,
// built on the shared MagicSetImageModal — surfaced directly on a card
// with no image yet, instead of requiring a multi-select just to add one
// photo. Awaits its own mutation and shows a loading state, only closing
// on success.
const { setImage } = useEventsMutations()
const imageModalOpen = ref(false)

async function confirmImage(imageUrl: string, cardName: string | null, artist: string | null) {
  if (!event) return
  await setImage.mutateAsync({
    id: event.id, imageUrl, imageCardName: cardName, imageCardArtist: artist
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
    <template v-if="!loading && event">
      <NuxtImg
        v-if="event.image"
        :src="event.image"
        :alt="event.name"
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

    <!-- Bottom row: status badge (left, same edge as the date chip above)
         and either the "set image" quick action or the card-art attribution
         chip (right) — the two are mutually exclusive, one requires the
         other missing. -->
    <div
      v-if="!loading && event"
      class="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2"
    >
      <!-- variant="solid": a bare subtle badge floating on an arbitrary
           photo isn't reliably legible for every status color (see
           TournamentsListCover.vue's own note). @click.stop because
           StatusChangeBadge's read-only branch (no manage-tournaments
           permission) has no click handler of its own, unlike its
           UDropdownMenu branch — without this it would bubble up to
           Card.vue's onCardClick and navigate into the event detail. -->
      <div class="shrink-0" @click.stop>
        <EventsStatusBadge :event="event" variant="solid" />
      </div>

      <!-- Quick "set image" action, only when there's none yet — an
           existing image is changed via EditModal instead, same as every
           other field, this is just for the common "never set one" case. -->
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

      <!-- Card-art attribution (required alongside any Scryfall art_crop
           use, see CardArtPicker.vue) — only when set. -->
      <UTooltip
        v-else-if="event.imageCardName"
        :text="event.imageCardArtist
          ? t('magic.cardArtPicker.attribution', {
            cardName: event.imageCardName, artist: event.imageCardArtist
          })
          : t('magic.cardArtPicker.attributionNoArtist', { cardName: event.imageCardName })"
        class="min-w-0"
      >
        <span class="block truncate rounded bg-default/90 backdrop-blur-sm px-1.5 py-0.5 text-[10px] text-muted">
          {{ event.imageCardName }}
        </span>
      </UTooltip>
    </div>
    <div v-else-if="loading" class="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
      <USkeleton class="w-20 h-6 rounded" :ui="{ base: 'bg-black' }" />
      <USkeleton class="w-24 h-4 rounded" :ui="{ base: 'bg-black' }" />
    </div>

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
