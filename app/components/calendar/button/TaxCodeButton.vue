<!-- app\components\calendar\button\TaxCodeButton.vue -->
<!--
  Tappable codice fiscale for /calendario, next to ContactButton.vue in
  CalendarFooter.vue — copies the code to the clipboard on click, same
  useCopyToClipboard pattern as the associates/players row actions (user
  request, 2026-08-30, for tax-return 5x1000 designation purposes).
-->
<script lang="ts" setup>
const TAX_CODE = '94047330223'

const { t } = useI18n()
const { copyToClipboard } = useCopyToClipboard()
</script>

<template>
  <UButton
    :trailing-icon="ICONS.copy"
    :label="`${t('event.calendar.taxCode')}: ${TAX_CODE}`"
    color="neutral"
    variant="ghost"
    size="sm"
    @click="copyToClipboard(TAX_CODE, t('event.calendar.taxCodeCopiedTitle'))"
  />
</template>
