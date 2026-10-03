// app\composables\useCopyLinkContextMenu.ts
// Generic "Copia link" + "Copia UUID" context menu shared by events/leagues/tournaments: just a
// route prefix and an item, no per-domain logic. Tournaments has real edit/delete (events/leagues
// are still pre-CRUD, see docs/BACKLOG.md): its index.vue appends its own items and reads
// `contextMenuRow` directly. Both use the public, non-enumerable `uuid` (an auto-increment `id` in
// the URL would let a visitor enumerate rows), not the numeric `id`.
import type { DropdownMenuItem } from '@nuxt/ui'

type LinkableItem = { id: number | string, uuid: string }

// `toPath` overrides the default `${routeBase}/${item.uuid}` link: locations is the one slug-based
// domain (`/locations/[slug]`, see LocationsListCard.vue). Optional and defaulted, so uuid-routed
// callers are unaffected
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
