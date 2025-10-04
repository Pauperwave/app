<script setup lang="ts">
import type { CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
// const toast = useToast()

const open = ref(false)

// Make the entire links array computed so active states are reactive
const links = computed(() => [[{
  label: 'Home',
  icon: 'i-lucide-house',
  to: '/',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Payments',
  icon: 'i-lucide-wallet',
  to: '/payments',
  defaultOpen: true,
  onSelect: () => {
    open.value = false
  },
  children: [{
    label: 'Association fee',
    to: '/payments?type=association-fee',
    active: route.query.type === 'association-fee' // Direct boolean
  }, {
    label: 'Event fee',
    to: '/payments?type=event-fee',
    active: route.query.type === 'event-fee' // Direct boolean
  }, {
    label: 'Donation',
    to: '/payments?type=donation',
    active: route.query.type === 'donation' // Direct boolean
  }, {
    label: 'Refund',
    to: '/payments?type=refund',
    active: route.query.type === 'refund' // Direct boolean
  }]
}, {
  label: 'Associates',
  icon: 'i-lucide-users',
  to: '/associates',
  badge: '215',
  defaultOpen: true,
  children: [{
    label: 'Waiting for approval',
    to: '/associates?status=waiting',
    active: route.query.status === 'waiting' // Direct boolean
  }, {
    label: 'Active',
    to: '/associates?status=active',
    active: route.query.status === 'active' // Direct boolean
  }, {
    label: 'Inactive',
    to: '/associates?status=inactive',
    active: route.query.status === 'inactive' // Direct boolean
  }]
}, {
  label: 'Events',
  icon: 'i-lucide-calendar',
  to: '/events',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Leagues',
  icon: 'i-lucide-trophy',
  to: '/leagues',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Tournaments',
  icon: 'i-lucide-swords',
  to: '/tournaments'
}, {
  label: 'Statistics',
  icon: 'i-lucide-chart-pie',
  to: '/statistics'
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
  }]
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
