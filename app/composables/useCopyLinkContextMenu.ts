// app\composables\useCopyLinkContextMenu.ts
// Generic "Copia link" + "Copia ID" context menu for domains that don't yet
// have edit/delete infrastructure (events/leagues/tournaments are still
// read-only, mock-data pages — see docs/BACKLOG.md). Unlike
// useWantedCardsRowActions.ts/useTransactionsRowActions.ts there is no
// per-domain logic here, just a route prefix and an id, so one shared
// composable covers all three instead of three near-identical copies.
import type { DropdownMenuItem } from '@nuxt/ui'

export function useCopyLinkContextMenu<T extends { id: number | string }>(routeBase: string) {
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
        onSelect: () => copyText(`${window.location.origin}${routeBase}/${item.id}`, t('common.linkCopied'))
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
