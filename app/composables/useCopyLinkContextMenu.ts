// app\composables\useCopyLinkContextMenu.ts
// Generic "Copia link" + "Copia UUID" context menu, shared across events/
// leagues/tournaments so each doesn't hand-roll the same two items — just a
// route prefix and an item, no per-domain logic. Tournaments now has real
// edit/delete infrastructure (unlike events/leagues, still pre-CRUD — see
// docs/BACKLOG.md); its index.vue appends its own items to
// rowContextMenuItems()'s result and reads `contextMenuRow` directly to do
// the same for the table's right-click menu, rather than this composable
// growing domain-specific branches.
// "Copia link" uses `uuid` (the public, non-enumerable identifier — an
// auto-increment `id` in the URL would let a visitor enumerate every row by
// walking /tournaments/1, /tournaments/2, ...); "Copia UUID" copies the same
// `uuid`, not the table's numeric `id` (user request, 2026-10-01).
import type { DropdownMenuItem } from '@nuxt/ui'

type LinkableItem = { id: number | string, uuid: string }

// `toPath` (2026-08-23, locations/index.vue) overrides the default
// `${routeBase}/${item.uuid}` link shape — locations is the one domain whose
// detail route is slug-based (`/locations/[slug]`, see LocationsListCard.vue),
// not uuid-based like tournaments/leagues/events. Optional and defaulted, so
// every existing uuid-routed caller is unaffected.
export function useCopyLinkContextMenu<T extends LinkableItem>(
  routeBase: string,
  toPath: (item: T) => string = item => `${routeBase}/${item.uuid}`
) {
  const { t } = useI18n()
  const { copyToClipboard } = useCopyToClipboard()

  function rowContextMenuItems(item: T): DropdownMenuItem[] {
    return [
      {
        label: t('common.copyLink'),
        icon: ICONS.link,
        onSelect: () => copyToClipboard(`${window.location.origin}${toPath(item)}`, t('common.linkCopied'))
      },
      {
        label: t('common.copyUuid'),
        icon: ICONS.copy,
        onSelect: () => copyToClipboard(item.uuid, t('common.uuidCopied'))
      }
    ]
  }

  const {
    contextMenuRow, onRowContextmenu, tableContextMenuItems
  } = useRowContextMenu(rowContextMenuItems)

  return {
    rowContextMenuItems, onRowContextmenu, tableContextMenuItems, contextMenuRow
  }
}
