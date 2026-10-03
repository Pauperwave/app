// app\composables\players\usePlayersRowActions.ts
// Right-click context menu for the "Giocatori" table, same UContextMenu +
// contextMenuRow/onRowContextmenu/tableContextMenuItems shape as useAssociatesRowActions.ts: Delete
// (usePlayersMutations.ts) plus jumping to the linked associate and copying contact details.
//
// "Promuovi a": /settings/members only lists existing staff (plain players have no user_roles row,
// assign_role deletes it), so it had no path to grant a *first* role. This menu is that path: the
// same assign_role call as MembersList.vue's role <USelect>, reusing useMembersQuery.ts's
// role/role_locked data so both surfaces agree on who is staff.
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

  // Same guards as MembersList.vue's isRoleSelectDisabled: a super_admin can only be touched by
  // another super_admin, a role_locked row (e.g. the account owner) never
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

  const { copyToClipboard } = useCopyToClipboard()

  // No undo window (unlike useWantedCardsRowActions.ts's confirmDelete), like
  // useTransactionsRowActions.ts: a player's tournament identity shouldn't be silently deleted
  // seconds after confirming. players.uuid is ON DELETE RESTRICT from every tournament-history
  // table, so deleting a player who ever played returns a 409 (see
  // server/api/players/[id]/delete.post.ts)
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
      // No account yet (player.user_id null): assign_role can't run without an auth.users row, so a
      // single disabled explanatory line replaces the submenu
      player.user_id
        ? {
          label: t('player.rowActions.promoteTo'),
          icon: ICONS.shieldPlus,
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
          icon: ICONS.shieldPlus,
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

  const { onRowContextmenu, tableContextMenuItems } = useRowContextMenu(rowContextMenuItems)

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
