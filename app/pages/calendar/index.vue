<!-- app\pages\calendar\index.vue -->
<script lang="ts" setup>
// Same convention as FormatPage.vue / associates/requests.vue's
// tesseramentoLink: point at this deploy's own /calendario for now, until
// the subdomain is wired up in DNS (settings/domains.vue).
const publicUrl = computed(() => `${useRequestURL().origin}/calendario`)
</script>

<template>
  <PageInDevelopment panel-id="calendar" :title="$t('nav.calendar')">
    <template #actions>
      <CopyLinkButton :url="publicUrl" :label="$t('event.copyPublicLink')" />
      <UTooltip :text="$t('event.openPublicLink')">
        <UButton
          :to="publicUrl"
          target="_blank"
          :icon="ICONS.externalLink"
          :aria-label="$t('event.openPublicLink')"
          color="neutral"
          variant="outline"
          square
        />
      </UTooltip>

      <USeparator orientation="vertical" class="h-4" />
    </template>

    <template #body>
      <PublicCalendarPage />
    </template>
  </PageInDevelopment>
</template>
