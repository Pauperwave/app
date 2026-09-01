// test\unit\composables\associates\useAssociatesRowActions.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssociatesRowActions } from '~/composables/associates/useAssociatesRowActions'
import type { Associate } from '~/types'

const approveAssociates = { mutateAsync: vi.fn() }
const rejectAssociates = { mutateAsync: vi.fn() }
const restoreAssociates = { mutateAsync: vi.fn() }

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/associates/useAssociatesMutations', () => ({
  useAssociatesMutations: () => ({ approveAssociates, rejectAssociates, restoreAssociates })
}))

function makeAssociate(overrides: Partial<Associate>): Associate {
  return {
    id: 1,
    phone_number: '+393203522674',
    email_address: 'alice@example.com',
    membership_request_status: 'approved',
    membership_status: 'active',
    ...overrides
  } as Associate
}

function menuLabels(items: ReturnType<ReturnType<typeof useAssociatesRowActions>['rowContextMenuItems']>) {
  return items.map(item => ('label' in item ? item.label : '---'))
}

describe('useAssociatesRowActions rowContextMenuItems', () => {
  beforeEach(() => {
    vi.stubGlobal('useToast', () => ({ add: vi.fn() }))
  })

  it('offers edit + editNumber for an approved associate, no approve/reject/restore', () => {
    const { rowContextMenuItems } = useAssociatesRowActions()
    const labels = menuLabels(rowContextMenuItems(makeAssociate({})))
    expect(labels).toContain('associate.rowActions.edit')
    expect(labels).toContain('associate.rowActions.editNumber')
    expect(labels).not.toContain('associate.rowActions.approve')
    expect(labels).not.toContain('associate.rowActions.restore')
  })

  it('offers approve/reject but not editNumber for a pending request', () => {
    const { rowContextMenuItems } = useAssociatesRowActions()
    const labels = menuLabels(rowContextMenuItems(makeAssociate({ membership_request_status: 'pending' })))
    expect(labels).toContain('associate.rowActions.approve')
    expect(labels).toContain('associate.rowActions.reject')
    expect(labels).not.toContain('associate.rowActions.editNumber')
  })

  it('offers restore for a rejected request', () => {
    const { rowContextMenuItems } = useAssociatesRowActions()
    const labels = menuLabels(rowContextMenuItems(makeAssociate({ membership_request_status: 'rejected' })))
    expect(labels).toContain('associate.rowActions.restore')
  })

  it('offers "pay" (not "renew") for an approved-but-unpaid associate', () => {
    const { rowContextMenuItems } = useAssociatesRowActions()
    const items = rowContextMenuItems(makeAssociate({ membership_status: 'unpaid' }))
    const labels = menuLabels(items)
    expect(labels).toContain('associate.rowActions.pay')
    expect(labels).not.toContain('associate.rowActions.renew')
  })

  it('offers "renew" for an approved associate whose membership needs renewing', () => {
    const { rowContextMenuItems } = useAssociatesRowActions()
    const labels = menuLabels(rowContextMenuItems(makeAssociate({ membership_status: 'to_renew' })))
    expect(labels).toContain('associate.rowActions.renew')
  })

  it('offers neither pay nor renew when membership is already active', () => {
    const { rowContextMenuItems } = useAssociatesRowActions()
    const labels = menuLabels(rowContextMenuItems(makeAssociate({ membership_status: 'active' })))
    expect(labels).not.toContain('associate.rowActions.pay')
    expect(labels).not.toContain('associate.rowActions.renew')
  })

  it('disables copy actions when the associate has no phone/email on file', () => {
    const { rowContextMenuItems } = useAssociatesRowActions()
    const items = rowContextMenuItems(makeAssociate({ phone_number: '', email_address: '' }))
    const copyPhone = items.find(item => 'label' in item && item.label === 'associate.rowActions.copyPhone')
    const copyEmail = items.find(item => 'label' in item && item.label === 'associate.rowActions.copyEmail')
    expect(copyPhone && 'disabled' in copyPhone ? copyPhone.disabled : undefined).toBe(true)
    expect(copyEmail && 'disabled' in copyEmail ? copyEmail.disabled : undefined).toBe(true)
  })

  it('openEditModal sets the editing associate and opens the modal', () => {
    const { openEditModal, editingAssociate, editModalOpen } = useAssociatesRowActions()
    const associate = makeAssociate({})
    openEditModal(associate)
    // ref() deep-wraps a plain object in a reactive proxy, so .value is not
    // the same reference as `associate` — compare by value, not identity.
    expect(editingAssociate.value).toEqual(associate)
    expect(editModalOpen.value).toBe(true)
  })

  it('approve calls the approveAssociates mutation with the associate id', async () => {
    approveAssociates.mutateAsync.mockResolvedValue(undefined)
    const { rowContextMenuItems } = useAssociatesRowActions()
    const items = rowContextMenuItems(makeAssociate({ membership_request_status: 'pending' }))
    const approveItem = items.find(item => 'label' in item && item.label === 'associate.rowActions.approve')
    await (approveItem && 'onSelect' in approveItem ? approveItem.onSelect?.(new Event('select')) : undefined)
    expect(approveAssociates.mutateAsync).toHaveBeenCalledWith([1])
  })
})
