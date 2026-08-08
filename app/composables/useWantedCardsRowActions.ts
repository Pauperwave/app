// app\composables\useWantedCardsRowActions.ts
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WantedCard, WantedCardStatus } from '~/types'

// Tutto ciò che riguarda "azioni su una riga" (cambio stato, modifica,
// eliminazione) — condiviso tra il menu contestuale della tabella e quello
// della griglia, più lo stato delle due modali che quelle azioni aprono.
export function useWantedCardsRowActions() {
  const { t } = useI18n()
  const toast = useToast()
  const { setStatus, deleteWantedCard, refreshPrices } = useWantedCardsMutations()

  // Scrittura riservata alla gestione via RLS lato server (has_management_
  // permissions) — un utente non-admin vede l'errore in un toast invece di
  // un aggiornamento silenziosamente ignorato.
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

  // URL di ricerca CardMarket — nessuna API, solo la stessa query che un
  // utente digiterebbe a mano nella barra di ricerca del sito.
  function cardMarketSearchUrl(name: string) {
    return `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(name)}`
  }

  // CardTrader non offre una ricerca per nome affidabile (vedi feasibility
  // study 2026-08-08, docs/PROGRESS.md) — si risolve il link diretto alla
  // scheda carta via server/api/cardtrader/resolve.get.ts, che di norma
  // legge dalla cache già scaldata in background alla creazione/modifica
  // della wanted-card (server/utils/cardTrader.ts). Si apre la finestra
  // PRIMA del fetch (sync, sul click) e se ne imposta la location dopo:
  // aprirla solo a fetch risolto verrebbe bloccata dal popup blocker, che
  // richiede un'apertura sincrona nel gesture dell'utente. NIENTE 'noopener'
  // qui: con quel flag window.open restituisce sempre null (per design, è
  // quello che rimuove il riferimento window.opener), quindi non potremmo
  // più reindirizzare la finestra dopo il fetch — la scheda resterebbe
  // vuota per sempre (bug osservato in test manuale 2026-08-08).
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

  // Stesso permesso di changeStatus/confirmDelete (solo gestione, vedi
  // refresh-prices.post.ts) — richiede scryfallId/setCode già popolati
  // (mancano solo sulle richieste create prima della migrazione 20260808120000
  // e non ancora modificate una volta).
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

  // Condiviso tra menu contestuale della tabella e delle card in griglia.
  // "Elimina" (come update) è riservato alla gestione via RLS — un utente
  // non-admin vede l'errore in un toast, come per gli altri item — vedi
  // migrazione 20260807190720 e il TODO in docs/TODO.md.
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

  // Popolato dal `@contextmenu` di UTable al tasto destro su una riga — la
  // UContextMenu che avvolge la tabella non conosce da sé la riga cliccata,
  // quindi la aggiorniamo qui e i suoi `:items` sono ricalcolati di conseguenza.
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
