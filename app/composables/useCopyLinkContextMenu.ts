// app\composables\useCopyLinkContextMenu.ts
// Generic "Copia link" + "Copia ID" context menu for domains that don't yet
// have edit/delete infrastructure (events/leagues/tournaments are still
// read-only, mock-data pages — see docs/BACKLOG.md). Unlike
// useWantedCardsRowActions.ts/useTransactionsRowActions.ts there is no
// per-domain logic here, just a route prefix and an item, so one shared
// composable covers all three instead of three near-identical copies.
// "Copia link" uses `uuid` (the public, non-enumerable identifier — an
// auto-increment `id` in the URL would let a visitor enumerate every row by
// walking /tournaments/1, /tournaments/2, ...); "Copia ID" intentionally
// keeps the numeric `id`, since that's the one support/admin conversations
// actually reference.
import type { DropdownMenuItem } from '@nuxt/ui'

type LinkableItem = { id: number | string, uuid: string }

export function useCopyLinkContextMenu<T extends LinkableItem>(routeBase: string) {
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
        onSelect: () => copyText(`${window.location.origin}${routeBase}/${item.uuid}`, t('common.linkCopied'))
      },
      {
        label: t('common.copyId'),
        icon: ICONS.copy,
        onSelect: () => copyText(String(item.id), t('common.idCopied'))
      }
    ]
  }

  // Same pattern as useWantedCardsRowActions.ts/useTransactionsRowActions.ts:
  // UTable's @contextmenu has no way of knowing which row was right-clicked on
  // its own, so it's tracked here and the wrapping UContextMenu's :items
  // recompute from it.
  const contextMenuRow = ref<T | null>(null)
  function onRowContextmenu(_e: Event, row: { original: T }) {
    contextMenuRow.value = row.original
  }
  const tableContextMenuItems = computed<DropdownMenuItem[]>(() =>
    contextMenuRow.value ? rowContextMenuItems(contextMenuRow.value) : [])

  return { rowContextMenuItems, onRowContextmenu, tableContextMenuItems }
}
