<!-- app\components\home\HomeQuickCreateMenu.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { t } = useI18n()

const items = computed<DropdownMenuItem[][]>(() => [[{
  label: t('home.quickCreate.newAssociate'),
  icon: ICONS.addPlayer,
  to: '/associates/richieste?action=create'
}, {
  label: t('home.quickCreate.newTransaction'),
  icon: ICONS.coins,
  to: '/transactions?action=create'
}, {
  label: t('home.quickCreate.newTournament'),
  icon: ICONS.battle,
  to: '/tournaments?action=create'
}, {
  label: t('home.quickCreate.newLeague'),
  icon: ICONS.standings,
  to: '/leagues?action=create'
}, {
  label: t('home.quickCreate.newEvent'),
  icon: ICONS.calendarAdd,
  to: '/events?action=create'
}]])
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton :icon="ICONS.add" size="md" class="rounded-lg" />
  </UDropdownMenu>
</template>
