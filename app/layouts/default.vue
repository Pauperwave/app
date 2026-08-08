<!-- app\layouts\default.vue -->
<script setup lang="ts">
import type { CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui'
import { ICONS } from '~/utils/icons'

const route = useRoute()
const { t } = useI18n()
// const toast = useToast()

const open = ref(false)

// Same 'associates' useAsyncData key as associates/index.vue — reuses that
// page's cached fetch instead of re-querying Supabase from the layout.
const { associates } = useAssociates()

// Ogni sezione è un sotto-array separato (non un unico array piatto con
// label inline): la spaziatura tra gruppi (gap-1.5 su UNavigationMenu
// root) resta visibile anche a sidebar collassata, perché è strutturale
// tra gruppi — a differenza degli item type:'label', che Nuxt UI rimuove
// completamente dal DOM quando collapsed è true (v-if, non solo nascosti).
// Array statico (non computed): UNavigationMenu evidenzia da sé la voce
// attiva confrontando `to` con la route corrente, nessun item qui dipende
// più da `route` per il proprio stato.
const mainNavGroups = [[{
  label: t('nav.dashboardsSection'),
  type: 'label'
}, {
  label: t('nav.dashboard'),
  icon: ICONS.home,
  to: '/',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('nav.calendar'),
  icon: ICONS.calendarView,
  disabled: true
}, {
  label: t('nav.finance'),
  icon: ICONS.badgeEuro,
  disabled: true
}], [{
  label: t('nav.community'),
  type: 'label'
}, {
  label: t('associate.breadcrumb'),
  icon: ICONS.players,
  to: '/associates',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('player.breadcrumb'),
  icon: ICONS.gameplay,
  to: '/players',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('transaction.breadcrumb'),
  icon: ICONS.wallet,
  to: '/transactions',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('wantedCard.breadcrumb'),
  icon: ICONS.cardSearch,
  to: '/wanted-cards',
  onSelect: () => {
    open.value = false
  }
}], [{
  label: t('nav.competitions'),
  type: 'label'
}, {
  label: t('league.breadcrumb'),
  icon: ICONS.standings,
  to: '/leagues',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('event.breadcrumb'),
  icon: ICONS.calendar,
  to: '/events',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('tournament.breadcrumb'),
  icon: ICONS.battle,
  to: '/tournaments'
}], [{
  label: t('nav.commanderSection'),
  type: 'label'
}, {
  label: t('commander.breadcrumb'),
  icon: ICONS.crown,
  to: '/commanders',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('statistic.decksBreadcrumb'),
  icon: ICONS.layers,
  to: '/statistics/decks',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('ruleset.breadcrumb'),
  icon: ICONS.rules,
  to: '/rulesets',
  onSelect: () => {
    open.value = false
  }
}], [{
  label: t('nav.statisticsSection'),
  type: 'label'
}, {
  label: t('statistic.overviewBreadcrumb'),
  icon: ICONS.chartPie,
  to: '/statistics',
  onSelect: () => {
    open.value = false
  }
}], [{
  label: t('nav.settingsSection'),
  type: 'label'
}, {
  label: t('settings.layout.links.general'),
  icon: ICONS.player,
  to: '/settings',
  disabled: true
}, {
  label: t('settings.layout.links.members'),
  icon: ICONS.players,
  to: '/settings/members',
  disabled: true
}, {
  label: t('settings.layout.links.notifications'),
  icon: ICONS.bell,
  to: '/settings/notifications',
  disabled: true
}, {
  label: t('settings.layout.links.security'),
  icon: ICONS.security,
  to: '/settings/security',
  disabled: true
}]] satisfies NavigationMenuItem[][]
// "Impostazioni" è presente in sidebar ma disattivata: la pagina è ancora
// lo scaffold di default del template, non personalizzata per PauperWave.

// Opens Gmail's compose view directly instead of mailto:, which silently
// no-ops when the OS has no default mail client configured.
const gmailComposeLink = (subject: string) => `https://mail.google.com/mail/?view=cm&fs=1&to=emanuelenardi.dev@gmail.com&su=${encodeURIComponent(subject)}`

const footerNavItems = [{
  label: t('nav.feedback'),
  icon: ICONS.messageCircle,
  to: gmailComposeLink(t('nav.feedbackSubject')),
  target: '_blank'
}, {
  label: t('nav.helpSupport'),
  icon: ICONS.info,
  to: gmailComposeLink(t('nav.helpSupportSubject')),
  target: '_blank'
}] satisfies NavigationMenuItem[]

// The CommandPalette/DashboardSearch doesn't support nested children arrays,it only shows flat lists.
// Each item in the items array should be a selectable command, not a group with children.
// Helper function to flatten nested navigation items for search
const flattenForSearch = (items: NavigationMenuItem[][]): CommandPaletteItem[] => {
  return items.flat().filter(item => item.type !== 'label' && !item.disabled).flatMap((item) => {
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
  label: t('nav.search.goTo'),
  items: flattenForSearch([...mainNavGroups, footerNavItems])
}, {
  id: 'associates',
  label: t('nav.search.associates'),
  items: associates.value.map(associate => ({
    id: `associate-${associate.id}`,
    label: `${associate.first_name} ${associate.last_name}`,
    suffix: associate.email_address,
    icon: ICONS.players,
    to: `/associate/${slugify(`${associate.first_name} ${associate.last_name}`)}`,
    onSelect: () => {
      open.value = false
    }
  }))
}, {
  id: 'code',
  label: t('nav.search.code'),
  items: [{
    id: 'source',
    label: t('nav.search.viewSource'),
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
        root: 'lg:border-e-0'
      }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-0" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="mainNavGroups"
          orientation="vertical"
          tooltip
          popover
        />

        <div class="mt-auto flex" :class="collapsed ? 'justify-center' : 'justify-start px-2.5'">
          <LayoutVersionBadge :collapsed="collapsed" />
        </div>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="footerNavItems"
          orientation="vertical"
          tooltip
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex items-center gap-2 w-full" :class="collapsed ? 'flex-col' : ''">
          <UserMenu :collapsed="collapsed" class="flex-1" />
          <LayoutColorModeSwitch />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>
