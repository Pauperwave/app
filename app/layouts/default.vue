<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
// const toast = useToast()

const open = ref(false)

const links = [[{
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
    to: '/payments?type=association-fee'
    // active: computed(() => route.query.type === 'association-fee')
  }, {
    label: 'Event fee',
    to: '/payments?type=event-fee'
    // active: computed(() => route.query.type === 'event-fee')
  }, {
    label: 'Donation',
    to: '/payments?type=donation'
    // active: computed(() => route.query.type === 'donation')
  }, {
    label: 'Refund',
    to: '/payments?type=refund'
    // active: computed(() => route.query.type === 'refund')
  }]
}, {
  label: 'Associates',
  icon: 'i-lucide-users',
  to: '/associates',
  badge: '215',
  defaultOpen: true,
  children: [{
    label: 'Waiting for approval',
    to: '/associates?status=waiting'
    // active: computed(() => route.query.status === 'waiting')
  }, {
    label: 'Active',
    to: '/associates?status=active'
    // active: computed(() => route.query.status === 'active')
  }, {
    label: 'Inactive',
    to: '/associates?status=inactive'
    // active: computed(() => route.query.status === 'inactive')
  }]
},
{
  label: 'Events',
  icon: 'i-lucide-calendar',
  to: '/events',
  onSelect: () => {
    open.value = false
  }
},
{
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
}]] satisfies NavigationMenuItem[][]

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: links.flat()
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
