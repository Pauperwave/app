<!-- app\components\calendar\button\TaxCodeButton.vue -->
<!-- Tappable codice fiscale for /calendario, next to ContactButton.vue in CalendarFooter.vue:
     it copies the code to the clipboard on click (the useCopyToClipboard pattern of the
     associates/players row actions), for 5x1000 tax-return designation. -->
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
