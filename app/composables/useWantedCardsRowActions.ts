// app\composables\useWantedCardsRowActions.ts
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WantedCard, WantedCardStatus } from '~/types'

// Everything about "row actions" (status change, edit, delete) — shared between
// the table's context menu and the grid's, plus the state of the two modals those
// actions open.
export function useWantedCardsRowActions() {
  const { t } = useI18n()
  const toast = useToast()
  const { setStatus, deleteWantedCard, refreshPrices } = useWantedCardsMutations()

  // Writes are restricted to management by server-side RLS (has_management_
  // permissions) — a non-admin user sees the error in a toast instead of an
  // update that is silently ignored.
  async function changeStatus(id: number, status: WantedCardStatus) {
    try {
      await setStatus.mutateAsync({ id, status })
    } catch (err) {
      toast.add({
        title: t('wantedCard.contextMenu.updateErrorTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    }
  }

  const editingCard = ref<WantedCard | null>(null)
  const editModalOpen = ref(false)
  function openEditModal(card: WantedCard) {
    editingCard.value = card
    editModalOpen.value = true
  }

  const deletingCard = ref<WantedCard | null>(null)
  const deleteConfirmOpen = ref(false)
  function openDeleteConfirm(card: WantedCard) {
    deletingCard.value = card
    deleteConfirmOpen.value = true
  }

  const deleting = ref(false)
  async function confirmDelete() {
    if (!deletingCard.value) return
    deleting.value = true
    try {
      await deleteWantedCard.mutateAsync(deletingCard.value.id)
      deleteConfirmOpen.value = false
    } catch (err) {
      toast.add({
        title: t('wantedCard.contextMenu.updateErrorTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    } finally {
      deleting.value = false
    }
  }

  const STATUS_MENU_ICONS: Record<WantedCardStatus, string> = {
    searching: 'i-lucide-rotate-ccw',
    found: 'i-lucide-check',
    abandoned: 'i-lucide-circle-x'
  }

  const STATUS_MENU_COLORS: Partial<Record<WantedCardStatus, DropdownMenuItem['color']>> = {
    found: 'success',
    abandoned: 'warning'
  }

  async function copyCardName(name: string) {
    try {
      await navigator.clipboard.writeText(name)
      toast.add({ title: t('wantedCard.contextMenu.nameCopied'), color: 'success' })
    } catch (err) {
      toast.add({
        title: t('wantedCard.contextMenu.updateErrorTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    }
  }

  // CardMarket search URL — no API, just the same query a user would type by hand
  // into the site's search bar.
  function cardMarketSearchUrl(name: string) {
    return `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(name)}`
  }

  // CardTrader offers no reliable search by name (see the 2026-08-08 feasibility
  // study, docs/PROGRESS.md) — the direct link to the card page is resolved via
  // server/api/cardtrader/resolve.get.ts, which normally reads from the cache
  // already warmed in the background when the wanted card was created or edited
  // (server/utils/cardTrader.ts). The window is opened BEFORE the fetch
  // (synchronously, on the click) and its location set afterwards: opening it only
  // once the fetch resolves would be stopped by the popup blocker, which requires a
  // synchronous open inside the user gesture. NO 'noopener' here: with that flag
  // window.open always returns null (by design — it is what drops the window.opener
  // reference), so the window could no longer be redirected after the fetch and the
  // tab would stay blank forever (bug observed in manual testing on 2026-08-08).
  async function openCardTraderSearch(card: WantedCard) {
    const fallbackUrl = `https://www.cardtrader.com/cards?name=${encodeURIComponent(card.cardName)}`
    const win = window.open('', '_blank')

    if (!card.scryfallId || !card.setCode) {
      if (win) win.location.href = fallbackUrl
      return
    }

    try {
      const { url } = await $fetch<{ url: string | null }>('/api/cardtrader/resolve', {
        query: { scryfallId: card.scryfallId, setCode: card.setCode }
      })
      if (win) win.location.href = url ?? fallbackUrl
    } catch {
      if (win) win.location.href = fallbackUrl
    }
  }

  // Same permission as changeStatus/confirmDelete (management only, see
  // refresh-prices.post.ts) — requires scryfallId/setCode to be populated (they are
  // missing only on requests created before migration 20260808120000 and never
  // edited since).
  async function refreshCardPrices(card: WantedCard) {
    try {
      await refreshPrices.mutateAsync(card.id)
      toast.add({ title: t('wantedCard.contextMenu.pricesRefreshed'), color: 'success' })
    } catch (err) {
      toast.add({
        title: t('wantedCard.contextMenu.updateErrorTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    }
  }

  // Shared between the table's context menu and the grid cards'. "Delete" (like
  // update) is restricted to management by RLS — a non-admin user sees the error in
  // a toast, as with the other items — see migration 20260807190720 and the TODO in
  // docs/TODO.md.
  function rowContextMenuItems(card: WantedCard): DropdownMenuItem[] {
    const statusItems = WANTED_CARD_STATUSES
      .filter(status => status !== card.status)
      .map(status => ({
        label: t(`wantedCard.contextMenu.markAs.${status}`),
        icon: STATUS_MENU_ICONS[status],
        color: STATUS_MENU_COLORS[status],
        onSelect: () => changeStatus(card.id, status)
      }))

    return [
      ...statusItems,
      { type: 'separator' },
      {
        label: t('wantedCard.contextMenu.copyName'),
        icon: 'i-lucide-copy',
        onSelect: () => copyCardName(card.cardName)
      },
      {
        label: t('wantedCard.contextMenu.viewOnScryfall'),
        icon: 'i-lucide-external-link',
        disabled: !card.scryfallUrl,
        onSelect: () => window.open(card.scryfallUrl, '_blank', 'noopener')
      },
      {
        label: t('wantedCard.contextMenu.searchOnCardMarket'),
        icon: 'i-lucide-search',
        onSelect: () => window.open(cardMarketSearchUrl(card.cardName), '_blank', 'noopener')
      },
      {
        label: t('wantedCard.contextMenu.searchOnCardTrader'),
        icon: 'i-lucide-search',
        onSelect: () => openCardTraderSearch(card)
      },
      {
        label: t('wantedCard.contextMenu.refreshPrices'),
        icon: 'i-lucide-refresh-cw',
        disabled: !card.scryfallId || !card.setCode,
        onSelect: () => refreshCardPrices(card)
      },
      { type: 'separator' },
      {
        label: t('wantedCard.contextMenu.edit'),
        icon: 'i-lucide-pencil',
        onSelect: () => openEditModal(card)
      },
      { type: 'separator' },
      {
        label: t('wantedCard.contextMenu.delete'),
        icon: 'i-lucide-trash',
        color: 'error',
        onSelect: () => openDeleteConfirm(card)
      }
    ]
  }

  // Populated by UTable's `@contextmenu` on right-click over a row — the
  // UContextMenu wrapping the table has no way of knowing which row was clicked,
  // so it is set here and its `:items` recompute accordingly.
  const contextMenuRow = ref<WantedCard | null>(null)
  function onRowContextmenu(_e: Event, row: { original: WantedCard }) {
    contextMenuRow.value = row.original
  }
  const tableContextMenuItems = computed(() =>
    contextMenuRow.value ? rowContextMenuItems(contextMenuRow.value) : [])

  return {
    rowContextMenuItems,
    onRowContextmenu,
    tableContextMenuItems,
    editingCard,
    editModalOpen,
    deletingCard,
    deleteConfirmOpen,
    openDeleteConfirm,
    deleting,
    confirmDelete
  }
}
