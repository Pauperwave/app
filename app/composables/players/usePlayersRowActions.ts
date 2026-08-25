// app\composables\players\usePlayersRowActions.ts
// Right-click context menu for the "Giocatori" table, same UContextMenu +
// contextMenuRow/onRowContextmenu/tableContextMenuItems shape as
// useAssociatesRowActions.ts. Delete (usePlayersMutations.ts) plus the two
// things a row click can't do: jump to the linked associate record, and copy
// contact details.
//
// "Promuovi a" (2026-08-25 user request) — /settings/members only lists
// existing staff (organizer/admin/super_admin all have a user_roles row;
// plain players don't, assign_role deletes it, see that composable's own
// comment), so it had no path to grant a *first* role to a player. This menu
// is that path: same assign_role call as MembersList.vue's own role
// <USelect>, reusing useMembersQuery.ts's role/role_locked data so the two
// surfaces never disagree about who's already staff.
import type { DropdownMenuItem } from '@nuxt/ui'
import type { MemberRole } from '#shared/types/settings'
import type { Player } from '~/types'

export function usePlayersRowActions() {
  const { t } = useI18n()
  const toast = useToast()
  const { deletePlayer } = usePlayersMutations()
  const { assignRole } = useMembersMutations()
  const { data: membersData } = useMembersQuery()
  const { isSuperAdmin } = useUserRole()

  const memberByAssociateUuid = computed(() =>
    new Map((membersData.value ?? []).map(member => [member.associateUuid, member])))

  // Same two guards as MembersList.vue's own isRoleSelectDisabled — an
  // existing super_admin can only be touched by another super_admin, and a
  // role_locked row (e.g. the account owner) never at all.
  function isRoleChangeDisabled(role: MemberRole, currentRole: MemberRole, roleLocked: boolean) {
    return role === currentRole
      || roleLocked
      || ((role === 'super_admin' || currentRole === 'super_admin') && !isSuperAdmin.value)
  }

  const changingPlayerUuid = ref<string | null>(null)
  async function promote(player: Player, role: MemberRole) {
    if (!player.user_id) return
    changingPlayerUuid.value = player.uuid
    try {
      await assignRole.mutateAsync({ userId: player.user_id, role })
    } catch (err) {
      toast.add({
        title: t('settings.members.roleChangeErrorTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    } finally {
      changingPlayerUuid.value = null
    }
  }

  // Same clipboard pattern as useAssociatesRowActions.ts's copyToClipboard.
  async function copyToClipboard(text: string, successTitle: string) {
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

  // No undo window here (unlike useWantedCardsRowActions.ts's confirmDelete)
  // — same reasoning as useTransactionsRowActions.ts: a player's tournament
  // identity isn't something to silently commit deleting a few seconds after
  // the confirm click. Server-side, players.uuid is ON DELETE RESTRICT from
  // every tournament-history table, so deleting a player who's ever actually
  // played surfaces as a 409 here rather than succeeding — see
  // server/api/players/[id]/delete.post.ts.
  const deletingPlayer = shallowRef<Player | null>(null)
  const deleteConfirmOpen = ref(false)
  const deleting = ref(false)
  function openDeleteConfirm(player: Player) {
    deletingPlayer.value = player
    deleteConfirmOpen.value = true
  }
  async function confirmDelete() {
    if (!deletingPlayer.value?.id) return
    deleting.value = true
    try {
      await deletePlayer.mutateAsync(deletingPlayer.value.id)
      deleteConfirmOpen.value = false
    } catch (err) {
      toast.add({
        title: t('player.rowActions.deleteErrorTitle'),
        description: isConflictError(err)
          ? t('player.rowActions.deleteConflictDescription')
          : toErrorMessage(err),
        color: 'error'
      })
    } finally {
      deleting.value = false
    }
  }

  function rowContextMenuItems(player: Player): DropdownMenuItem[] {
    const associateLink = (player.first_name && player.last_name)
      ? `/associate/${slugify(`${player.first_name} ${player.last_name}`)}`
      : null

    const member = player.associate_uuid
      ? memberByAssociateUuid.value.get(player.associate_uuid)
      : undefined
    const currentRole: MemberRole = member?.role ?? 'player'
    const roleLocked = member?.roleLocked ?? false

    return [
      {
        label: t('player.detail.viewAssociateProfile'),
        icon: ICONS.idCard,
        disabled: !associateLink,
        onSelect: () => { if (associateLink) navigateTo(associateLink) }
      },
      { type: 'separator' as const },
      {
        label: t('player.rowActions.copyEmail'),
        icon: ICONS.mail,
        disabled: !player.email_address,
        onSelect: () => copyToClipboard(player.email_address!, t('player.rowActions.emailCopied'))
      },
      { type: 'separator' as const },
      // No account yet (player.user_id null) — assign_role structurally
      // can't run without a real auth.users row, so this shows as a single
      // disabled explanatory line instead of a submenu with no working items.
      player.user_id
        ? {
          label: t('player.rowActions.promoteTo'),
          icon: ICONS.security,
          children: (['player', 'organizer', 'admin', 'super_admin'] as const)
            .filter(role => role !== 'super_admin' || isSuperAdmin.value)
            .map(role => ({
              label: t(`settings.members.roles.${role}`),
              icon: ROLE_ICON[role],
              disabled: isRoleChangeDisabled(role, currentRole, roleLocked),
              loading: changingPlayerUuid.value === player.uuid,
              onSelect: () => promote(player, role)
            }))
        }
        : {
          label: t('player.rowActions.promoteTo'),
          icon: ICONS.security,
          disabled: true,
          description: t('settings.members.noAccountYet')
        },
      { type: 'separator' as const },
      {
        label: t('player.rowActions.delete'),
        icon: ICONS.delete,
        color: 'error' as const,
        onSelect: () => openDeleteConfirm(player)
      }
    ]
  }

  // shallowRef, not ref: Player carries the same recursive-type risk noted in
  // useAssociatesRowActions.ts (AvatarProps-shaped fields), so this ref is
  // only ever replaced wholesale, never mutated through a nested property.
  const contextMenuRow = shallowRef<Player | null>(null)
  function onRowContextmenu(_e: Event, row: { original: Player }) {
    contextMenuRow.value = row.original
  }
  const tableContextMenuItems = computed<DropdownMenuItem[]>(() =>
    contextMenuRow.value ? rowContextMenuItems(contextMenuRow.value) : [])

  return {
    rowContextMenuItems,
    onRowContextmenu,
    tableContextMenuItems,
    deletingPlayer,
    deleteConfirmOpen,
    deleting,
    openDeleteConfirm,
    confirmDelete
  }
}
