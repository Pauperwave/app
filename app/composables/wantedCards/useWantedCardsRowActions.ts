// app\composables\wantedCards\useWantedCardsRowActions.ts
// fallow-ignore-file security-sink -- the
// win.location.href assignments only receive a hardcoded cardtrader.com/cardmarket URL
// (encodeURIComponent) or the url of our own /api/cardtrader/resolve; window.open uses
// Scryfall-derived URLs
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WantedCard, WantedCardStatus } from '~/types'

// Everything about "row actions" (status change, edit, delete), shared by the table's and the
// grid's context menus, plus the state of the two modals they open. "Refresh prices" acts on the
// whole selection when the right-clicked card is part of it, and says how many cards it will do
// (`refreshSelection` is the bulk refresh of useWantedCardsBulkActions.ts).
export function useWantedCardsRowActions(
  selectedCards: Ref<WantedCard[]>,
  refreshSelection: (cards: WantedCard[]) => Promise<void>
) {
  const { t } = useI18n()
  const toast = useToast()
  const undoable = useUndoableAction()
  const { setStatus, deleteWantedCard, refreshPrices } = useWantedCardsMutations()
  const { isStaff } = useUserRole()
  const currentAssociate = useCurrentAssociate()

  // Status change and delete are allowed for management OR the request's owner
  // (requireManagementOrWantedCardOwner): checked here too so the menu doesn't offer an action that
  // would 403, unlike edit/refresh-prices which stay management-only
  function canManage(card: WantedCard): boolean {
    return isStaff.value || card.playerAssociateUuid === currentAssociate.value?.uuid
  }

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

  // Closes the modal at once and defers the delete behind a 10-second undo window
  // (useUndoableAction.ts): nothing to await at confirm time
  function confirmDelete() {
    if (!deletingCard.value) return
    const card = deletingCard.value
    deleteConfirmOpen.value = false

    undoable.run({
      title: t('wantedCard.contextMenu.deleteUndoToast', { name: card.cardName }),
      commit: async () => {
        try {
          await deleteWantedCard.mutateAsync(card.id)
        } catch (err) {
          toast.add({
            title: t('wantedCard.contextMenu.updateErrorTitle'),
            description: toErrorMessage(err),
            color: 'error'
          })
        }
      }
    })
  }

  const STATUS_MENU_ICONS: Record<WantedCardStatus, string> = {
    searching: ICONS.rotateBack,
    found: ICONS.confirm,
    abandoned: ICONS.clear
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

  // CardMarket search URL: no API, just the query a user would type into the site's search bar
  function cardMarketSearchUrl(name: string) {
    return `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(name)}`
  }

  // CardTrader has no reliable search by name (docs/PROGRESS.md feasibility study): the card page
  // link is resolved by server/api/cardtrader/resolve.get.ts, normally from the cache warmed when
  // the card was created/edited (server/utils/cardTrader.ts). The window is opened synchronously on
  // the click and its location set after the fetch: opening it after would hit the popup blocker.
  // NO 'noopener': with it window.open returns null (it drops window.opener), so the tab could not
  // be redirected and stayed blank
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

  // Same permission as changeStatus/confirmDelete (management only, see refresh-prices.post.ts);
  // needs scryfallId/setCode, missing only on requests created before migration 20260808120000 and
  // never edited since
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

  // Shared by the table's context menu and the grid cards'. Status-change and delete are hidden
  // (not disabled) for a card the viewer neither manages nor owns (canManage() mirrors
  // requireManagementOrWantedCardOwner, avoiding a 403). Edit/refresh-prices stay management-only
  // regardless of ownership (see migration 20260807190720 and docs/TODO.md)
  function rowContextMenuItems(card: WantedCard): DropdownMenuItem[] {
    const manageable = canManage(card)
    const targets = contextMenuTargets(card, selectedCards.value)
    const refreshable = targets.filter(canRefreshPrices)
    const refreshLabel = t('wantedCard.contextMenu.refreshPrices')

    const statusItems: DropdownMenuItem[] = manageable
      ? WANTED_CARD_STATUSES
        .filter(status => status !== card.status)
        .map(status => ({
          label: t(`wantedCard.contextMenu.markAs.${status}`),
          icon: STATUS_MENU_ICONS[status],
          color: STATUS_MENU_COLORS[status],
          onSelect: () => changeStatus(card.id, status)
        }))
      : []

    return [
      ...statusItems,
      ...(statusItems.length ? [{ type: 'separator' as const }] : []),
      {
        label: t('wantedCard.contextMenu.copyName'),
        icon: ICONS.copy,
        onSelect: () => copyCardName(card.cardName)
      },
      {
        label: t('wantedCard.contextMenu.viewOnScryfall'),
        icon: ICONS.externalLink,
        disabled: !card.scryfallUrl,
        onSelect: () => window.open(card.scryfallUrl, '_blank', 'noopener')
      },
      {
        label: t('wantedCard.contextMenu.searchOnCardMarket'),
        icon: ICONS.search,
        onSelect: () => window.open(cardMarketSearchUrl(card.cardName), '_blank', 'noopener')
      },
      {
        label: t('wantedCard.contextMenu.searchOnCardTrader'),
        icon: ICONS.search,
        onSelect: () => openCardTraderSearch(card)
      },
      {
        label: targets.length > 1 ? withCount(refreshLabel, refreshable.length) : refreshLabel,
        icon: ICONS.refresh,
        disabled: !isStaff.value || refreshable.length === 0,
        onSelect: () => {
          if (targets.length > 1) return refreshSelection(refreshable)
          return refreshCardPrices(card)
        }
      },
      { type: 'separator' },
      {
        label: t('wantedCard.contextMenu.edit'),
        icon: ICONS.edit,
        disabled: !isStaff.value,
        onSelect: () => openEditModal(card)
      },
      ...(manageable
        ? [
          { type: 'separator' as const },
          {
            label: t('wantedCard.contextMenu.delete'),
            icon: ICONS.delete,
            color: 'error' as const,
            onSelect: () => openDeleteConfirm(card)
          }
        ]
        : [])
    ]
  }

  const { onRowContextmenu, tableContextMenuItems } = useRowContextMenu(rowContextMenuItems)

  return {
    rowContextMenuItems,
    onRowContextmenu,
    tableContextMenuItems,
    editingCard,
    editModalOpen,
    deletingCard,
    deleteConfirmOpen,
    openDeleteConfirm,
    confirmDelete
  }
}
