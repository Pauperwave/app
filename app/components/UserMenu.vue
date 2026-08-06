<!-- app\components\UserMenu.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const supabase = useSupabaseClient()
const toast = useToast()
const { t } = useI18n()

const colorMode = useColorMode()
const appConfig = useAppConfig()

const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']
const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']

const user = ref({
  name: 'Emanuele Nardi',
  avatar: {
    src: 'https://github.com/emanuelenardi.png',
    alt: 'Emanuele Nardi'
  }
})

const handleLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.add({
        title: t('userMenu.logoutErrorTitle'),
        description: t('userMenu.logoutErrorDescription'),
        color: 'error'
      })
    } else {
      toast.add({
        title: t('userMenu.logoutSuccessTitle'),
        description: t('userMenu.logoutSuccessDescription'),
        color: 'success'
      })
      navigateTo('/login')
    }
  } catch (err) {
    console.error('Logout error:', err)
    toast.add({
      title: t('userMenu.logoutErrorTitle'),
      description: t('userMenu.genericErrorDescription'),
      color: 'error'
    })
  }
}

const items = computed<DropdownMenuItem[][]>(() => ([[{
  type: 'label',
  label: user.value.name,
  avatar: user.value.avatar
}], [{
  label: t('userMenu.profile'),
  icon: 'i-lucide-user'
}, {
  label: t('userMenu.settings'),
  icon: 'i-lucide-settings',
  to: '/settings'
}], [{
  label: t('userMenu.theme'),
  icon: 'i-lucide-palette',
  children: [{
    label: t('userMenu.primary'),
    slot: 'chip',
    chip: appConfig.ui.colors.primary,
    content: {
      align: 'center',
      collisionPadding: 16
    },
    children: colors.map(color => ({
      label: color,
      chip: color,
      slot: 'chip',
      checked: appConfig.ui.colors.primary === color,
      type: 'checkbox',
      onSelect: (e) => {
        e.preventDefault()

        appConfig.ui.colors.primary = color
      }
    }))
  }, {
    label: t('userMenu.neutral'),
    slot: 'chip',
    chip: appConfig.ui.colors.neutral === 'neutral' ? 'old-neutral' : appConfig.ui.colors.neutral,
    content: {
      align: 'end',
      collisionPadding: 16
    },
    children: neutrals.map(color => ({
      label: color,
      chip: color === 'neutral' ? 'old-neutral' : color,
      slot: 'chip',
      type: 'checkbox',
      checked: appConfig.ui.colors.neutral === color,
      onSelect: (e) => {
        e.preventDefault()

        appConfig.ui.colors.neutral = color
      }
    }))
  }]
}, {
  label: t('userMenu.appearance'),
  icon: 'i-lucide-sun-moon',
  children: [{
    label: t('userMenu.light'),
    icon: 'i-lucide-sun',
    type: 'checkbox',
    checked: colorMode.value === 'light',
    onSelect(e: Event) {
      e.preventDefault()

      colorMode.preference = 'light'
    }
  }, {
    label: t('userMenu.dark'),
    icon: 'i-lucide-moon',
    type: 'checkbox',
    checked: colorMode.value === 'dark',
    onUpdateChecked(checked: boolean) {
      if (checked) {
        colorMode.preference = 'dark'
      }
    },
    onSelect(e: Event) {
      e.preventDefault()
    }
  }]
}], [{
  label: t('userMenu.githubRepository'),
  icon: 'i-simple-icons-github',
  to: 'https://github.com/Pauperwave/app',
  target: '_blank'
}, {
  label: t('userMenu.logout'),
  icon: 'i-lucide-log-out',
  onSelect: handleLogout
}]]))
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...user,
        label: collapsed ? undefined : user?.name,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />

    <template #chip-leading="{ item }">
      <span
        :style="{
          '--chip-light': `var(--color-${(item as any).chip}-500)`,
          '--chip-dark': `var(--color-${(item as any).chip}-400)`
        }"
        class="ms-0.5 size-2 rounded-full bg-(--chip-light) dark:bg-(--chip-dark)"
      />
    </template>
  </UDropdownMenu>
</template>
