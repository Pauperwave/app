<!-- app\components\magic\EdhrecButton.vue -->
<!-- "Vedi su EDHREC" outline button linking to a commander's EDHREC page, next to the Scryfall one
     on the commander/deck detail pages -->
<script setup lang="ts">
const { name } = defineProps<{ name: string | null }>()
const { t } = useI18n()
</script>

<template>
  <UButton
    :label="t('deck.viewOnEdhrec')"
    :icon="ICONS.externalLink"
    variant="outline"
    color="neutral"
    :to="name ? edhrecCommanderUrl(name) : '#'"
    target="_blank"
  />
</template>
