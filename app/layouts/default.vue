<script setup lang="ts">
import type { CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui'
import { ICONS } from '~/utils/icons'

const route = useRoute()
// const toast = useToast()

const open = ref(false)

// Ogni sezione è un sotto-array separato (non un unico array piatto con
// label inline): la spaziatura tra gruppi (gap-1.5 su UNavigationMenu
// root) resta visibile anche a sidebar collassata, perché è strutturale
// tra gruppi — a differenza degli item type:'label', che Nuxt UI rimuove
// completamente dal DOM quando collapsed è true (v-if, non solo nascosti).
// Array statico (non computed): UNavigationMenu evidenzia da sé la voce
// attiva confrontando `to` con la route corrente, nessun item qui dipende
// più da `route` per il proprio stato.
const mainNavGroups = [[{
  label: 'Pannello di controllo',
  icon: ICONS.home,
  to: '/',
  onSelect: () => {
    open.value = false
  }
}], [{
  label: 'Community',
  type: 'label'
}, {
  label: 'Associati',
  icon: ICONS.players,
  to: '/associates',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Giocatori',
  icon: ICONS.gameplay,
  to: '/players',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Transazioni',
  icon: ICONS.wallet,
  to: '/transactions',
  onSelect: () => {
    open.value = false
  }
}], [{
  label: 'Competizioni',
  type: 'label'
}, {
  label: 'Leghe',
  icon: ICONS.standings,
  to: '/leagues',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Eventi',
  icon: ICONS.calendar,
  to: '/events',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Tornei',
  icon: ICONS.battle,
  to: '/tournaments'
}], [{
  label: 'Commander',
  type: 'label'
}, {
  label: 'Comandanti',
  icon: ICONS.crown,
  to: '/commanders',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Mazzi',
  icon: ICONS.layers,
  to: '/statistics/decks',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Regolamenti',
  icon: ICONS.rules,
  to: '/rulesets',
  onSelect: () => {
    open.value = false
  }
}], [{
  label: 'Statistiche',
  type: 'label'
}, {
  label: 'Panoramica',
  icon: ICONS.chartPie,
  to: '/statistics',
  onSelect: () => {
    open.value = false
  }
}]] satisfies NavigationMenuItem[][]
// "Impostazioni" temporaneamente rimossa dalla sidebar: la pagina è ancora
// lo scaffold di default del template, non personalizzata per PauperWave.

const footerNavItems = [{
  label: 'Feedback',
  icon: ICONS.messageCircle,
  to: 'https://t.me/emanuelenardi',
  target: '_blank'
}, {
  label: 'Help & Support',
  icon: ICONS.info,
  to: 'https://t.me/emanuelenardi',
  target: '_blank'
}] satisfies NavigationMenuItem[]

// The CommandPalette/DashboardSearch doesn't support nested children arrays,it only shows flat lists.
// Each item in the items array should be a selectable command, not a group with children.
// Helper function to flatten nested navigation items for search
const flattenForSearch = (items: NavigationMenuItem[][]): CommandPaletteItem[] => {
  return items.flat().filter(item => item.type !== 'label').flatMap((item) => {
    // Parent item
    const parent: CommandPaletteItem = {
      label: item.label,
      icon: item.icon,
      to: item.to,
      badge: item.badge,
      onSelect: item.onSelect
    }

    // Children with parent context
    const children = (item.children || []).map(child => ({
      label: `${item.label} → ${child.label}`,
      icon: child.icon || item.icon,
      to: child.to,
      onSelect: child.onSelect
    }))

    return [parent, ...children]
  }) as CommandPaletteItem[]
}

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: flattenForSearch([...mainNavGroups, footerNavItems])
}, {
  id: 'code',
  label: 'Code',
  items: [{
    id: 'source',
    label: 'View page source',
    icon: ICONS.github,
    to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
    target: '_blank'
  }]
}])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-default"
      :ui="{
        root: 'lg:border-e-0',
        footer: 'lg:border-t lg:border-default'
      }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="mainNavGroups"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="footerNavItems"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>
