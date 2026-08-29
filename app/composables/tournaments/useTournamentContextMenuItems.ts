// app\composables\tournaments\useTournamentContextMenuItems.ts
// Extracted out of tournaments/index.vue and leagues/[leagueId]/index.vue
// (2026-08-29) — both built the exact same edit/copy/delete additions on top
// of useCopyLinkContextMenu's shared copy-link/copy-id items, byte-identical.
// Not folded into useCopyLinkContextMenu.ts itself: that one stays generic
// across every domain (events/leagues/locations/tournaments), while this is
// tournaments-specific (edit/copy/delete require real CRUD, which only
// tournaments has so far — see useCopyLinkContextMenu.ts's own comment).
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Tournament } from '~/types'

export function useTournamentContextMenuItems(
  rowContextMenuItems: (tournament: Tournament) => DropdownMenuItem[],
  openEditModal: (tournament: Tournament) => void,
  openCopyModal: (tournament: Tournament) => void,
  requestDelete: (tournaments: Tournament[]) => void
) {
  const { t } = useI18n()

  function tournamentContextMenuItems(tournament: Tournament): DropdownMenuItem[] {
    return [
      ...rowContextMenuItems(tournament),
      { type: 'separator' },
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
