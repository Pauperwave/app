// app\composables\tournaments\list\useTournamentContextMenuItems.ts
// Shared by tournaments/index.vue and leagues/[leagueId]/index.vue: the edit/copy/delete additions
// on top of useCopyLinkContextMenu's copy-link/copy-uuid items. Not folded into
// useCopyLinkContextMenu.ts, which stays generic across domains, while edit/copy/delete need real
// CRUD, which only tournaments has
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Tournament } from '~/types'

export function useTournamentContextMenuItems(
  rowContextMenuItems: (tournament: Tournament) => DropdownMenuItem[],
  openEditModal: (tournament: Tournament) => void,
  openCopyModal: (tournament: Tournament) => void,
  requestDelete: (tournaments: Tournament[]) => void
) {
  const { t } = useI18n()
  const toast = useToast()
  const { setPinned } = useTournamentsMutations()

  async function togglePinned(tournament: Tournament) {
    try {
      await setPinned.mutateAsync({ id: tournament.id, isPinned: !tournament.isPinned })
    } catch {
      toast.add({ title: t('tournament.pinErrorTitle'), color: 'error' })
    }
  }

  function tournamentContextMenuItems(tournament: Tournament): DropdownMenuItem[] {
    return [
      ...rowContextMenuItems(tournament),
      { type: 'separator' },
      {
        label: tournament.isPinned ? t('tournament.rowActions.unpin') : t('tournament.rowActions.pin'),
        icon: tournament.isPinned ? ICONS.pinOff : ICONS.pin,
        onSelect: () => togglePinned(tournament)
      },
      {
        label: t('tournament.rowActions.edit'),
        icon: ICONS.edit,
        onSelect: () => openEditModal(tournament)
      },
      {
        label: t('tournament.rowActions.copy'),
        icon: ICONS.copy,
        onSelect: () => openCopyModal(tournament)
      },
      { type: 'separator' },
      {
        label: t('tournament.rowActions.delete'),
        icon: ICONS.delete,
        color: 'error',
        onSelect: () => requestDelete([tournament])
      }
    ]
  }

  return { tournamentContextMenuItems }
}
