// app\composables\layout\useCommandPaletteGroups.ts
// Extracted out of default.vue (2026-09-18) — builds UDashboardSearch's
// group list (quick-create actions, nav links, associate search, sign-out,
// view-source), same "pure data, not layout logic" split as
// useMainNavGroups.ts/useNavBadgeCounts.ts.
import type { CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui'

// The CommandPalette/DashboardSearch doesn't support nested children arrays,
// it only shows flat lists. Each item in the items array should be a
// selectable command, not a group with children — so a nav item with
// children is flattened into itself plus one entry per child, prefixed with
// the parent's own label for context.
function flattenForSearch(items: NavigationMenuItem[][]): CommandPaletteItem[] {
  return items.flat().filter(item => item.type !== 'label' && !item.disabled).flatMap((item) => {
    const parent: CommandPaletteItem = {
      label: item.label,
      icon: item.icon,
      to: item.to,
      badge: item.badge,
      onSelect: item.onSelect
    }

    const children = (item.children || []).map(child => ({
      label: `${item.label} → ${child.label}`,
      icon: child.icon || item.icon,
      to: child.to,
      onSelect: child.onSelect
    }))

    return [parent, ...children]
  }) as CommandPaletteItem[]
}

export function useCommandPaletteGroups(options: {
  open: Ref<boolean>
  mainNavGroups: ComputedRef<NavigationMenuItem[][]>
  footerNavItems: NavigationMenuItem[]
}) {
  const { open, mainNavGroups, footerNavItems } = options
  const { t } = useI18n()
  const route = useRoute()

  // Same 'associates' Pinia Colada key as useHomeActionCounts.ts's own —
  // feeds the "associates" search group below, no extra fetch.
  const { data: associates } = useAssociatesQuery()

  // "New …" items reuse the same "?action=create" convention as
  // home/QuickCreateMenu.vue — landing on the list page with its Add modal
  // already open, instead of a modal owned by the palette itself. Mapped
  // from useQuickCreateItems.ts, the single source both surfaces read from
  // (2026-08-19, user request) — the two had already drifted before that
  // existed (this list was missing tournament/league/event/location
  // entirely). Nested under a single "Create new" item's `children` array so
  // the palette drills into a submenu (CommandPalette.vue's native
  // `navigate`/back behavior) rather than listing every quick-create flat in
  // the actions group.
  const quickCreateItems = useQuickCreateItems()
  const handleLogout = useLogout()

  const actionItems = computed<CommandPaletteItem[]>(() => [{
    id: 'create-new',
    label: t('nav.search.createNew'),
    icon: ICONS.add,
    children: quickCreateItems.map(item => ({
      id: `create-${item.id}`,
      label: item.label,
      icon: item.icon,
      to: item.to,
      onSelect: () => { open.value = false }
    }))
  }, {
    id: 'sign-out',
    label: t('userMenu.logout'),
    icon: ICONS.logout,
    onSelect: () => {
      open.value = false
      handleLogout()
    }
  }])

  return computed(() => [{
    id: 'actions',
    label: t('nav.search.actions'),
    items: actionItems.value
  }, {
    id: 'links',
    label: t('nav.search.goTo'),
    items: flattenForSearch([...mainNavGroups.value, footerNavItems])
  }, {
    id: 'associates',
    label: t('nav.search.associates'),
    items: (associates.value ?? []).map(associate => ({
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
}
