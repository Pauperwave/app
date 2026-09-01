// test\unit\composables\players\usePlayersRowActions.test.ts
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlayersRowActions } from '~/composables/players/usePlayersRowActions'
import type { Player } from '~/types'

const deletePlayer = { mutateAsync: vi.fn() }
const assignRole = { mutateAsync: vi.fn() }
const members = ref<{ associateUuid: string, role: string, roleLocked: boolean }[]>([])
const isSuperAdmin = ref(false)
const toastAdd = vi.fn()
const navigateTo = vi.fn()

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/players/usePlayersMutations', () => ({
  usePlayersMutations: () => ({ deletePlayer })
}))
vi.mock('~/composables/settings/useMembersMutations', () => ({
  useMembersMutations: () => ({ assignRole })
}))
vi.mock('~/composables/settings/useMembersQuery', () => ({
  useMembersQuery: () => ({ data: members })
}))
vi.mock('~/composables/useUserRole', () => ({
  useUserRole: () => ({ isSuperAdmin })
}))

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: 1,
    uuid: 'p1',
    first_name: 'Mario',
    last_name: 'Rossi',
    email_address: 'mario@example.com',
    user_id: null,
    associate_uuid: null,
    ...overrides
  } as Player
}

describe('usePlayersRowActions', () => {
  beforeEach(() => {
    toastAdd.mockClear()
    navigateTo.mockClear()
    assignRole.mutateAsync.mockReset()
    deletePlayer.mutateAsync.mockReset()
    members.value = []
    isSuperAdmin.value = false
    vi.stubGlobal('useToast', () => ({ add: toastAdd }))
    vi.stubGlobal('navigateTo', navigateTo)
  })

  it('disables the associate-profile link when the player has no name', () => {
    const { rowContextMenuItems } = usePlayersRowActions()
    const items = rowContextMenuItems(makePlayer({ first_name: '', last_name: '' }))
    const link = items.find(i => 'label' in i && i.label === 'player.detail.viewAssociateProfile')
    expect(link && 'disabled' in link ? link.disabled : undefined).toBe(true)
  })

  it('enables the associate-profile link and navigates to a slugified path', async () => {
    const { rowContextMenuItems } = usePlayersRowActions()
    const items = rowContextMenuItems(makePlayer({}))
    const link = items.find(i => 'label' in i && i.label === 'player.detail.viewAssociateProfile')
    expect(link && 'disabled' in link ? link.disabled : undefined).toBe(false)
    await (link && 'onSelect' in link ? link.onSelect?.(new Event('select')) : undefined)
    expect(navigateTo).toHaveBeenCalledWith('/associate/mario-rossi')
  })

  it('shows a disabled explanatory line when the player has no account yet', () => {
    const { rowContextMenuItems } = usePlayersRowActions()
    const items = rowContextMenuItems(makePlayer({ user_id: null }))
    const promote = items.find(i => 'label' in i && i.label === 'player.rowActions.promoteTo')
    expect(promote && 'disabled' in promote ? promote.disabled : undefined).toBe(true)
    expect(promote && 'children' in promote).toBe(false)
  })

  it('shows a role submenu for a player with an account, excluding super_admin unless previewing as one', () => {
    const { rowContextMenuItems } = usePlayersRowActions()
    const items = rowContextMenuItems(makePlayer({ user_id: 'auth1' }))
    const promote = items.find(i => 'label' in i && i.label === 'player.rowActions.promoteTo')
    const children = promote && 'children' in promote ? promote.children : []
    expect(children?.map((c: { label: string }) => c.label)).toEqual([
      'settings.members.roles.player', 'settings.members.roles.organizer', 'settings.members.roles.admin'
    ])
  })

  it('includes super_admin in the role submenu when the viewer is a super_admin', () => {
    isSuperAdmin.value = true
    const { rowContextMenuItems } = usePlayersRowActions()
    const items = rowContextMenuItems(makePlayer({ user_id: 'auth1' }))
    const promote = items.find(i => 'label' in i && i.label === 'player.rowActions.promoteTo')
    const children = promote && 'children' in promote ? promote.children : []
    expect(children?.some((c: { label: string }) => c.label === 'settings.members.roles.super_admin')).toBe(true)
  })

  it('disables the role-change item for the player\'s current role', () => {
    members.value = [{ associateUuid: 'a1', role: 'organizer', roleLocked: false }]
    const { rowContextMenuItems } = usePlayersRowActions()
    const items = rowContextMenuItems(makePlayer({ user_id: 'auth1', associate_uuid: 'a1' }))
    const promote = items.find(i => 'label' in i && i.label === 'player.rowActions.promoteTo')
    const children = promote && 'children' in promote ? promote.children : []
    const organizerItem = children?.find((c: { label: string }) => c.label === 'settings.members.roles.organizer')
    expect(organizerItem?.disabled).toBe(true)
  })

  it('disables every role change on a role_locked member', () => {
    members.value = [{ associateUuid: 'a1', role: 'admin', roleLocked: true }]
    const { rowContextMenuItems } = usePlayersRowActions()
    const items = rowContextMenuItems(makePlayer({ user_id: 'auth1', associate_uuid: 'a1' }))
    const promote = items.find(i => 'label' in i && i.label === 'player.rowActions.promoteTo')
    const children = promote && 'children' in promote ? promote.children : []
    expect(children?.every((c: { disabled: boolean }) => c.disabled)).toBe(true)
  })

  it('a non-super_admin cannot touch an existing super_admin member', () => {
    members.value = [{ associateUuid: 'a1', role: 'super_admin', roleLocked: false }]
    isSuperAdmin.value = false
    const { rowContextMenuItems } = usePlayersRowActions()
    const items = rowContextMenuItems(makePlayer({ user_id: 'auth1', associate_uuid: 'a1' }))
    const promote = items.find(i => 'label' in i && i.label === 'player.rowActions.promoteTo')
    const children = promote && 'children' in promote ? promote.children : []
    expect(children?.every((c: { disabled: boolean }) => c.disabled)).toBe(true)
  })

  it('disables copyEmail when the player has no email on file', () => {
    const { rowContextMenuItems } = usePlayersRowActions()
    const items = rowContextMenuItems(makePlayer({ email_address: '' }))
    const copyEmail = items.find(i => 'label' in i && i.label === 'player.rowActions.copyEmail')
    expect(copyEmail && 'disabled' in copyEmail ? copyEmail.disabled : undefined).toBe(true)
  })

  it('promote does nothing when the player has no user_id', async () => {
    const { rowContextMenuItems } = usePlayersRowActions()
    const items = rowContextMenuItems(makePlayer({ user_id: null }))
    const promote = items.find(i => 'label' in i && i.label === 'player.rowActions.promoteTo')
    expect(promote && 'onSelect' in promote ? promote.onSelect : undefined).toBeUndefined()
    expect(assignRole.mutateAsync).not.toHaveBeenCalled()
  })

  it('confirmDelete does nothing without a pending player', async () => {
    const { confirmDelete } = usePlayersRowActions()
    await confirmDelete()
    expect(deletePlayer.mutateAsync).not.toHaveBeenCalled()
  })

  it('confirmDelete closes the modal on success', async () => {
    deletePlayer.mutateAsync.mockResolvedValue(undefined)
    const { openDeleteConfirm, confirmDelete, deleteConfirmOpen } = usePlayersRowActions()
    openDeleteConfirm(makePlayer({ id: 3 }))
    await confirmDelete()
    expect(deletePlayer.mutateAsync).toHaveBeenCalledWith(3)
    expect(deleteConfirmOpen.value).toBe(false)
  })
})
