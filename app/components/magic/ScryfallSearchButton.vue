<!-- app\components\magic\ScryfallSearchButton.vue -->
<!-- "Vedi su Scryfall" outline button linking to a Scryfall exact-name search, shared by the
     commander/deck detail pages (statistics/commanders/[commanderSlug].vue,
     statistics/decks/[deckSlug].vue, players/[slug]/deck/[deckSlug].vue), beside EdhrecButton -->
<script setup lang="ts">
const { name } = defineProps<{ name: string | null }>()
const { t } = useI18n()

const scryfallSearchUrl = computed(() => name
  ? `https://scryfall.com/search?q=!"${encodeURIComponent(name)}"`
  : '#')
</script>

<template>
  <UButton
    :label="t('deck.viewOnScryfall')"
    :icon="ICONS.externalLink"
    variant="outline"
    color="neutral"
    :to="scryfallSearchUrl"
    target="_blank"
  />
</template>
