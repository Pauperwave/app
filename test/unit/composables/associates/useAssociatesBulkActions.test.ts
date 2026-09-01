// test\unit\composables\associates\useAssociatesBulkActions.test.ts
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssociatesBulkActions } from '~/composables/associates/useAssociatesBulkActions'
import { useSelection } from '~/composables/useSelection'
import type { Associate } from '~/types'

const createTransaction = { mutateAsync: vi.fn() }
const settingsData = ref<
  { membershipFeeAmount: number, membershipFeePaymentMethod: string } | null
>({
  membershipFeeAmount: 25, membershipFeePaymentMethod: 'Cash'
})
const toastAdd = vi.fn()

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/transactions/useTransactionsMutations', () => ({
  useTransactionsMutations: () => ({ createTransaction })
}))
vi.mock('~/composables/transactions/useTransactionFormOptions', () => ({
  useTransactionFormOptions: () => ({ receiverOptions: ref([{ label: 'Nardi Emanuele', value: 'Nardi Emanuele' }]) })
}))
vi.mock('~/composables/settings/useSettingsQuery', () => ({
  useSettingsQuery: () => ({ data: settingsData })
}))

function makeAssociate(overrides: Partial<Associate>): Associate {
  return { id: 1, uuid: 'a1', ...overrides } as Associate
}

describe('useAssociatesBulkActions', () => {
  beforeEach(() => {
    toastAdd.mockClear()
    createTransaction.mutateAsync.mockReset()
    settingsData.value = { membershipFeeAmount: 25, membershipFeePaymentMethod: 'Cash' }
    vi.stubGlobal('useToast', () => ({ add: toastAdd }))
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('requestBulkRenew opens the confirm modal and resets receivedBy', () => {
    const selection = useSelection<number>()
    const {
      requestBulkRenew, pendingRenewal, confirmOpen, receivedBy
    } = useAssociatesBulkActions(selection)
    receivedBy.value = 'stale'
    requestBulkRenew([makeAssociate({ id: 1 })])
    expect(confirmOpen.value).toBe(true)
    expect(pendingRenewal.value).toHaveLength(1)
    expect(receivedBy.value).toBeUndefined()
  })

  it('confirmBulkRenew does nothing without a receiver selected', () => {
    const selection = useSelection<number>()
    const { requestBulkRenew, confirmBulkRenew, confirmOpen } = useAssociatesBulkActions(selection)
    requestBulkRenew([makeAssociate({ id: 1 })])
    confirmBulkRenew()
    expect(confirmOpen.value).toBe(true)
  })

  it('confirmBulkRenew does nothing when the membership fee setting has not loaded', () => {
    settingsData.value = null
    const selection = useSelection<number>()
    const {
      requestBulkRenew, confirmBulkRenew, receivedBy, confirmOpen
    } = useAssociatesBulkActions(selection)
    requestBulkRenew([makeAssociate({ id: 1 })])
    receivedBy.value = 'Nardi Emanuele'
    confirmBulkRenew()
    expect(confirmOpen.value).toBe(true)
  })

  it('after the undo window elapses, creates one Association Fee transaction per associate', async () => {
    createTransaction.mutateAsync.mockResolvedValue(undefined)
    const selection = useSelection<number>()
    selection.toggle(1)
    const {
      requestBulkRenew, confirmBulkRenew, receivedBy, confirmOpen, pendingRenewal
    }
      = useAssociatesBulkActions(selection)
    const associates = [makeAssociate({ id: 1, uuid: 'a1' }), makeAssociate({ id: 2, uuid: 'a2' })]
    requestBulkRenew(associates)
    receivedBy.value = 'Nardi Emanuele'
    confirmBulkRenew()

    expect(confirmOpen.value).toBe(false)
    expect(pendingRenewal.value).toBeNull()
    expect(selection.selectedIds.value.size).toBe(0)

    await vi.advanceTimersByTimeAsync(10000)

    expect(createTransaction.mutateAsync).toHaveBeenCalledTimes(2)
    expect(createTransaction.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      associateUuid: 'a1', paymentAmount: 25, paymentMethod: 'Cash', paymentType: 'Association Fee'
    }))
  })

  it('feeReady reflects whether the settings query has loaded', () => {
    settingsData.value = null
    const selection = useSelection<number>()
    const { feeReady } = useAssociatesBulkActions(selection)
    expect(feeReady.value).toBe(false)
  })
})
