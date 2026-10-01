<!-- app\components\ui\CardArtCredit.vue -->
<!--
  Credit for a Scryfall art_crop used as a cover (required alongside any use, see
  CardArtPicker.vue): the card name as a small badge, the full credit in the tooltip. Shared by the
  event/league/tournament covers and the tournament award cards, which each had their own copy.
  Positioning/sizing classes come from the caller and land on the badge itself.
-->
<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const { cardName, artist = null } = defineProps<{
  cardName: string
  artist?: string | null
}>()

const { t } = useI18n()

const credit = computed(() => artist
  ? t('magic.cardArtPicker.attribution', { cardName, artist })
  : t('magic.cardArtPicker.attributionNoArtist', { cardName }))
</script>

<template>
  <UTooltip :text="credit">
    <span
      v-bind="$attrs"
      class="block truncate rounded bg-default/90 backdrop-blur-sm px-1.5 py-0.5 text-[10px] text-muted"
    >
      {{ cardName }}
    </span>
  </UTooltip>
</template>
