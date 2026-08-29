// app\composables\useCopyLinkContextMenu.ts
// Generic "Copia link" + "Copia ID" context menu, shared across events/
// leagues/tournaments so each doesn't hand-roll the same two items — just a
// route prefix and an item, no per-domain logic. Tournaments now has real
// edit/delete infrastructure (unlike events/leagues, still pre-CRUD — see
// docs/BACKLOG.md); its index.vue appends its own items to
// rowContextMenuItems()'s result and reads `contextMenuRow` directly to do
// the same for the table's right-click menu, rather than this composable
// growing domain-specific branches.
// "Copia link" uses `uuid` (the public, non-enumerable identifier — an
// auto-increment `id` in the URL would let a visitor enumerate every row by
// walking /tournaments/1, /tournaments/2, ...); "Copia ID" intentionally
// keeps the numeric `id`, since that's the one support/admin conversations
// actually reference.
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
  const toast = useToast()

  async function copyText(text: string, successTitle: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({ title: successTitle, color: 'success' })
    } catch (err) {
      toast.add({
        title: t('common.copyErrorTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    }
  }

  function rowContextMenuItems(item: T): DropdownMenuItem[] {
    return [
      {
        label: t('common.copyLink'),
        icon: ICONS.link,
        onSelect: () => copyText(`${window.location.origin}${toPath(item)}`, t('common.linkCopied'))
      },
      {
        label: t('common.copyId'),
        icon: ICONS.copy,
        onSelect: () => copyText(String(item.id), t('common.idCopied'))
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
