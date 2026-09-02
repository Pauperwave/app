<!-- app\components\magic\CardArtPicker.vue -->
<!--
  Standalone cover-image picker sourcing artwork directly from Scryfall
  (2026-08-16, user request) — reuses useScryfallCardSearch.ts's name
  typeahead + printings query (same composable as WantedCardsListAddModal.vue),
  but selects a printing's art_crop (cropped illustration, no card frame)
  rather than the full card image, since the result becomes a banner/cover,
  not a card reference. Also tracks the card name/artist alongside the URL
  (2026-08-20, migration 20260820120000) — Scryfall's API usage guidelines
  require the artist name and copyright to be shown next to any art_crop use,
  since the crop itself has no in-image credit (unlike the full card). Shown
  below the picker here, and again wherever the cover ends up rendered
  (TournamentsListCover.vue/LeaguesListCover.vue).

  Printing picker is a USelectMenu with a hover-preview row
  (CardArtPickerRow.vue/MagicCardHoverPreview), same pattern as
  wanted-cards/FormFields.vue's "Edizione" field — replaced a raw
  unlabeled thumbnail grid (user request, 2026-09-02: inconsistent with
  the rest of the app, and gave no way to tell printings apart before
  hovering).
-->
<script setup lang="ts">
const model = defineModel<string | undefined>()
const cardName = defineModel<string | undefined>('cardName')
const artist = defineModel<string | undefined>('artist')

const { t } = useI18n()

const {
  query, nameSuggestions, isSuggesting, printings, isLoadingPrintings, fetchPrintings
} = useScryfallCardSearch()

const selectedName = ref<string>()
const selectedPrintingId = ref<string>()
const open = ref(false)

// value-key on the name: keeps selectedName a plain string even though the
// items also carry the front-face image for the row preview.
const nameItems = computed(() => nameSuggestions.value.map(suggestion => ({
  label: suggestion.name,
  imageUrl: suggestion.imageUrl,
  value: suggestion.name
})))

watch(selectedName, (name) => {
  fetchPrintings(name)
  selectedPrintingId.value = undefined
})

// Not every printing has an art_crop (some promos/tokens don't) — only those
// are offered as a cover choice.
const artOptions = computed(() => printings.value.filter(printing => printing.artCropUrl))

const printingItems = computed(() => artOptions.value.map(printing => ({
  label: printing.setName,
  collectorNumber: printing.collectorNumber,
  imageUrl: printing.artCropUrl,
  value: printing.id
})))

watch(selectedPrintingId, (id) => {
  const printing = artOptions.value.find(candidate => candidate.id === id)
  if (!printing?.artCropUrl) return

  model.value = printing.artCropUrl
  cardName.value = printing.name
  artist.value = printing.artist ?? undefined
  open.value = false
  selectedName.value = undefined
  selectedPrintingId.value = undefined
  query.value = ''
})

function clear() {
  model.value = undefined
  cardName.value = undefined
  artist.value = undefined
}
</script>

<template>
  <div>
    <UPopover v-model:open="open">
      <button
        type="button"
        class="relative w-full h-32 rounded-lg border border-default overflow-hidden group"
      >
        <NuxtImg
          v-if="model"
          :src="model"
          :alt="t('magic.cardArtPicker.selectedAlt')"
          format="webp"
          width="640"
          height="128"
          class="w-full h-full object-cover"
        />
        <div
          v-else
          class="w-full h-full flex flex-col items-center justify-center gap-1 text-muted bg-elevated"
        >
          <UIcon :name="ICONS.image" class="size-6" />
          <span class="text-sm">{{ t('magic.cardArtPicker.placeholder') }}</span>
        </div>

        <div class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <span class="text-white text-sm font-medium">
            {{ model ? t('magic.cardArtPicker.change') : t('magic.cardArtPicker.select') }}
          </span>
        </div>
      </button>

      <template #content>
        <div class="p-3 w-80 space-y-3">
          <USelectMenu
            v-model="selectedName"
            v-model:search-term="query"
            :items="nameItems"
            value-key="value"
            :loading="isSuggesting"
            ignore-filter
            :placeholder="t('magic.cardArtPicker.searchPlaceholder')"
            :icon="ICONS.cardSearch"
            class="w-full"
          />

          <div v-if="isLoadingPrintings" class="text-sm text-muted text-center py-4">
            {{ t('magic.cardArtPicker.loading') }}
          </div>

          <div v-else-if="selectedName && artOptions.length === 0" class="text-sm text-muted text-center py-4">
            {{ t('magic.cardArtPicker.noResults') }}
          </div>

          <USelectMenu
            v-else-if="artOptions.length"
            v-model="selectedPrintingId"
            :items="printingItems"
            value-key="value"
            :filter-fields="['label', 'collectorNumber']"
            :placeholder="t('magic.cardArtPicker.printingPlaceholder')"
            class="w-full"
          >
            <template #item-label="{ item }">
              <MagicCardArtPickerRow
                :label="item.label"
                :collector-number="item.collectorNumber"
                :image-url="item.imageUrl"
              />
            </template>
          </USelectMenu>
        </div>
      </template>
    </UPopover>

    <!-- Required alongside any art_crop use per Scryfall's API usage
         guidelines — see the top-of-file comment. -->
    <p v-if="model && cardName" class="mt-1 text-xs text-muted truncate">
      {{ artist
        ? t('magic.cardArtPicker.attribution', { cardName, artist })
        : t('magic.cardArtPicker.attributionNoArtist', { cardName }) }}
    </p>

    <UButton
      v-if="model"
      :label="t('magic.cardArtPicker.clear')"
      color="neutral"
      variant="link"
      size="xs"
      class="mt-1 p-0"
      @click="clear"
    />
  </div>
</template>
