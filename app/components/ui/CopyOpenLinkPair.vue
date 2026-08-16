<!-- app\components\ui\CopyOpenLinkPair.vue -->
<!--
  Shared "copy link" + "open in new tab" button pair, used wherever a page
  links out to its own public counterpart (associates/requests.vue's
  tesseramento link, FormatPage.vue's/cittadino's public rankings link —
  fallow:dupes flagged this markup as an identical clone across them).
-->
<script setup lang="ts">
defineProps<{
  url: string
  copyLabel: string
  openLabel: string
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <CopyLinkButton :url="url" :label="copyLabel" />
    <UTooltip :text="openLabel">
      <UButton
        :to="url"
        target="_blank"
        :icon="ICONS.externalLink"
        :aria-label="openLabel"
        color="neutral"
        variant="outline"
        square
      />
    </UTooltip>
  </div>
</template>
