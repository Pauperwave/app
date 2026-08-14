<!-- app\components\events\RegisterButton.vue -->
<!--
  "Iscriviti" button for /calendario's cards and detail slideover (user
  request 2026-08-14) — UI placeholder only. Registering doesn't send a
  dashboard notification yet (no backend for it exists); see docs/TODO.md
  for that follow-up. Until then this just confirms the tap with a toast.
-->
<script lang="ts" setup>
const { t } = useI18n()
const toast = useToast()

function register() {
  toast.add({
    title: t('event.calendar.registerComingSoonTitle'),
    description: t('event.calendar.registerComingSoonDescription'),
    color: 'info'
  })
}
</script>

<template>
  <UButton
    :label="$t('event.calendar.register')"
    :icon="ICONS.addPlayer"
    color="primary"
    variant="solid"
    size="sm"
    @click="register"
  />
</template>
