<!-- app\components\home\HomeQuickCreateMenu.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { t } = useI18n()

const items = computed<DropdownMenuItem[][]>(() => [[{
  label: t('home.quickCreate.newAssociate'),
  icon: 'i-lucide-user-plus',
  to: '/associates?action=create'
}, {
  label: t('home.quickCreate.newTransaction'),
  icon: 'i-lucide-coins',
  to: '/transactions?action=create'
}, {
  label: t('home.quickCreate.newTournament'),
  icon: 'i-lucide-swords',
  to: '/tournaments?action=create'
}, {
  label: t('home.quickCreate.newLeague'),
  icon: 'i-lucide-trophy',
  to: '/leagues?action=create'
}, {
  label: t('home.quickCreate.newEvent'),
  icon: 'i-lucide-calendar-plus',
  to: '/events?action=create'
}]])
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton icon="i-lucide-plus" size="md" class="rounded-lg" />
  </UDropdownMenu>
</template>
