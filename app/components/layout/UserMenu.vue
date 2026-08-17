<!-- app\components\layout\UserMenu.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { ICONS } from '~/utils/icons'

defineProps<{
  collapsed?: boolean
}>()

const { t } = useI18n()

const colorMode = useColorMode()
const appConfig = useAppConfig()

const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']
const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']

// "Profilo" points at the logged-in user's own associate record — there's no
// player detail page yet (/players is still a stub), and the associate record
// is the closer match anyway (membership/anagrafica, not gameplay stats).
// undefined when no matching associate exists yet, so the item just isn't a
// link rather than pointing somewhere broken.
const currentAssociate = useCurrentAssociate()
const profileLink = computed(() => currentAssociate.value
  ? `/associate/${slugify(`${currentAssociate.value.first_name} ${currentAssociate.value.last_name}`)}`
  : undefined)

const user = ref({
  name: 'Emanuele Nardi',
  avatar: {
    src: 'https://github.com/emanuelenardi.png',
    alt: 'Emanuele Nardi'
  }
})

const handleLogout = useLogout()

// "View as" (2026-08-17, docs/architecture/roles.md §1): UI-only preview,
// super_admin-only. Gated on realIsSuperAdmin (not role/isSuperAdmin),
// so the control that exits a preview stays visible and usable even while
// actively previewing as a lower role — see useUserRole.ts's own comment.
const {
  realIsSuperAdmin, isSuperAdmin, role, isPreviewing, setRolePreview
} = useUserRole()

// Increasing-authority iconography: player (user) -> organizer (shield) ->
// admin (crown) — super_admin omitted from the preview list entirely (a
// no-op for the only role that can even see this menu), so it needs no icon.
const ROLE_PREVIEW_ICON = {
  player: ICONS.player,
  organizer: ICONS.security,
  admin: ICONS.crown
} as const satisfies Record<'player' | 'organizer' | 'admin', string>

const rolePreviewGroup = computed<DropdownMenuItem[]>(() => realIsSuperAdmin.value
  ? [{
    label: t('rolePreview.menuLabel'),
    icon: ICONS.show,
    children: (['player', 'organizer', 'admin'] as const).map(previewable => ({
      label: t(`settings.members.roles.${previewable}`),
      icon: ROLE_PREVIEW_ICON[previewable],
      type: 'checkbox' as const,
      checked: role.value === previewable && isPreviewing.value,
      onSelect: (e: Event) => {
        e.preventDefault()

        setRolePreview(previewable)
      }
    }))
  }, ...(isPreviewing.value
    ? [{
      label: t('rolePreview.exitMenuLabel'),
      icon: ICONS.close,
      onSelect: () => setRolePreview(null)
    }]
    : [])]
  : [])

const items = computed<DropdownMenuItem[][]>(() => ([[{
  type: 'label',
  label: user.value.name,
  avatar: user.value.avatar
}], [{
  label: t('userMenu.profile'),
  icon: ICONS.player,
  to: profileLink.value
}, {
  label: t('userMenu.settings'),
  icon: ICONS.settings,
  to: '/settings'
}], ...(rolePreviewGroup.value.length ? [rolePreviewGroup.value] : []), [{
  label: t('userMenu.theme'),
  icon: ICONS.palette,
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
  icon: ICONS.themeAuto,
  children: [{
    label: t('userMenu.light'),
    icon: ICONS.lightMode,
    type: 'checkbox',
    checked: colorMode.preference === 'light',
    onSelect(e: Event) {
      e.preventDefault()

      colorMode.preference = 'light'
    }
  }, {
    label: t('userMenu.dark'),
    icon: ICONS.darkMode,
    type: 'checkbox',
    checked: colorMode.preference === 'dark',
    onSelect(e: Event) {
      e.preventDefault()

      colorMode.preference = 'dark'
    }
  }, {
    label: t('userMenu.automatic'),
    icon: ICONS.themeAuto,
    type: 'checkbox',
    checked: colorMode.preference === 'system',
    onSelect(e: Event) {
      e.preventDefault()

      colorMode.preference = 'system'
    }
  }]
}], [...(isSuperAdmin.value
  ? [{
    label: t('userMenu.githubRepository'),
    icon: ICONS.github,
    to: 'https://github.com/Pauperwave/app',
    target: '_blank'
  }]
  : []), {
  label: t('userMenu.logout'),
  icon: ICONS.logout,
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
        trailingIcon: collapsed ? undefined : ICONS.chevronsUpDown
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
