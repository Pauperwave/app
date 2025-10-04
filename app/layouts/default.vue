<script setup lang="ts">
import type { CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
// const toast = useToast()

const open = ref(false)

// Make the entire links array computed so active states are reactive
const links = computed(() => [[{
  label: 'Pannello di controllo',
  icon: 'i-lucide-house',
  to: '/',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Transazioni',
  icon: 'i-lucide-wallet',
  type: 'link',
  to: '/payments',
  defaultOpen: true,
  onSelect: () => {
    open.value = false
  },
  children: [{
    label: 'Tutte le transazioni',
    to: '/payments',
    exact: true,
    active: route.path === '/payments' && !route.query.type,
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Quote associative',
    to: '/payments?type=association-fee',
    active: route.query.type === 'association-fee' // Direct boolean
  }, {
    label: 'Quote per evento',
    to: '/payments?type=event-fee',
    active: route.query.type === 'event-fee' // Direct boolean
  }, {
    label: 'Donazioni',
    to: '/payments?type=donation',
    active: route.query.type === 'donation' // Direct boolean
  }, {
    label: 'Rimborsi',
    to: '/payments?type=refund',
    active: route.query.type === 'refund' // Direct boolean
  }] satisfies NavigationMenuItem[]
}, {
  label: 'Associati',
  icon: 'i-lucide-users',
  type: 'link',
  to: '/associates',
  defaultOpen: true,
  children: [{
    label: 'Tutti gli associati',
    to: '/associates',
    active: route.path === '/associates' && !route.query.status, // attivo quando non c'è query
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'In attesa di approvazione',
    to: '/associates?status=waiting',
    badge: '5',
    active: route.query.status === 'waiting' // Direct boolean
  }, {
    label: 'Attivi',
    to: '/associates?status=active',
    badge: '200',
    active: route.query.status === 'active' // Direct boolean
  }, {
    label: 'Da rinnovare',
    to: '/associates?status=inactive',
    badge: '10',
    active: route.query.status === 'inactive' // Direct boolean
  }] satisfies NavigationMenuItem[]
}, {
  label: 'Eventi',
  icon: 'i-lucide-calendar',
  to: '/events',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Leghe',
  icon: 'i-lucide-trophy',
  to: '/leagues',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Tornei',
  icon: 'i-lucide-swords',
  to: '/tournaments'
}, {
  label: 'Statistiche',
  icon: 'i-lucide-chart-pie',
  type: 'link',
  to: '/statistics',
  defaultOpen: true,
  children: [{
    label: 'Panoramica',
    to: '/statistics',
    active: route.path === '/statistics' && !route.query.type,
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Mazzi',
    to: '/statistics/decks',
    active: route.path === '/statistics/decks',
    onSelect: () => {
      open.value = false
    }
  }] satisfies NavigationMenuItem[]
}, {
  label: 'Settings',
  to: '/settings',
  icon: 'i-lucide-settings',
  defaultOpen: false,
  type: 'trigger',
  children: [{
    label: 'General',
    to: '/settings',
    exact: true,
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Members',
    to: '/settings/members',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Notifications',
    to: '/settings/notifications',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Security',
    to: '/settings/security',
    onSelect: () => {
      open.value = false
    }
  }] satisfies NavigationMenuItem[]
}], [{
  label: 'Feedback',
  icon: 'i-lucide-message-circle',
  to: 'https://t.me/emanuelenardi',
  target: '_blank'
}, {
  label: 'Help & Support',
  icon: 'i-lucide-info',
  to: 'https://t.me/emanuelenardi',
  target: '_blank'
}]] satisfies NavigationMenuItem[][])

// The CommandPalette/DashboardSearch doesn't support nested children arrays,it only shows flat lists.
// Each item in the items array should be a selectable command, not a group with children.
// Helper function to flatten nested navigation items for search
const flattenForSearch = (items: NavigationMenuItem[][]): CommandPaletteItem[] => {
  return items.flat().flatMap((item) => {
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
  items: flattenForSearch(links.value)
}, {
  id: 'code',
  label: 'Code',
  items: [{
    id: 'source',
    label: 'View page source',
    icon: 'i-simple-icons-github',
    to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
    target: '_blank'
  }]
}])

// Show cookie consent toast
// Removed for development purposes
// onMounted(async () => {
//   const cookie = useCookie('cookie-consent')
//   if (cookie.value === 'accepted') {
//     return
//   }

//   toast.add({
//     title: 'We use first-party cookies to enhance your experience on our website.',
//     duration: 0,
//     close: false,
//     actions: [{
//       label: 'Accept',
//       color: 'neutral',
//       variant: 'outline',
//       onClick: () => {
//         cookie.value = 'accepted'
//       }
//     }, {
//       label: 'Opt out',
//       color: 'neutral',
//       variant: 'ghost'
//     }]
//   })
// })
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
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
