// test\unit\composables\tournaments\registration\useAcceptancePickerPayments.test.ts
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAcceptancePickerPayments } from '~/composables/tournaments/registration/useAcceptancePickerPayments'
import type { AcceptancePickerItem } from '~/components/tournaments/single/AcceptancePicker.vue'
import type { TournamentPayment } from '~/composables/tournaments/registration/useTournamentPaymentsQuery'

const paymentsData = ref<TournamentPayment[]>([])
const setPayment = { mutate: vi.fn() }
const toastAdd = vi.fn()

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/tournaments/registration/useTournamentPaymentsQuery', () => ({
  useTournamentPaymentsQuery: () => ({ data: paymentsData })
}))
vi.mock('~/composables/tournaments/registration/useTournamentRegistrationsMutations', () => ({
  useTournamentRegistrationsMutations: () => ({ setPayment })
}))

function makeItem(overrides: Partial<AcceptancePickerItem>): AcceptancePickerItem {
  return {
    label: 'Mario Rossi',
    description: '',
    avatar: { alt: 'MR' },
    value: 'p1',
    preRegisteredAt: new Date(),
    ...overrides
  }
}

describe('useAcceptancePickerPayments', () => {
  beforeEach(() => {
    localStorage.clear()
    paymentsData.value = []
    setPayment.mutate.mockClear()
    toastAdd.mockClear()
    vi.stubGlobal('useToast', () => ({ add: toastAdd }))
  })

  it('mirrors the query data into paymentMethodByPlayer, keyed by associate uuid', () => {
    paymentsData.value = [{ associateUuid: 'p1', paymentMethod: 'cash' }]
    const { paymentMethodByPlayer } = useAcceptancePickerPayments({ tournamentUuid: 't1' })
    expect(paymentMethodByPlayer.p1).toBe('cash')
  })

  it('setPaymentMethod warns and refuses a brand-new payment when nobody is selected as receivedBy', () => {
    const { setPaymentMethod } = useAcceptancePickerPayments({ tournamentUuid: 't1' })
    setPaymentMethod(makeItem({}), 'cash')
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'warning' }))
    expect(setPayment.mutate).not.toHaveBeenCalled()
  })

  it('setPaymentMethod proceeds once receivedBy is set', () => {
    const { setPaymentMethod, receivedBy } = useAcceptancePickerPayments({ tournamentUuid: 't1' })
    receivedBy.value = 'Staff Member'
    setPaymentMethod(makeItem({ value: 'p1' }), 'cash')
    expect(setPayment.mutate).toHaveBeenCalledWith({
      associateUuid: 'p1', method: 'cash', receivedBy: 'Staff Member'
    })
  })

  it('setPaymentMethod does not require receivedBy when updating an existing payment', () => {
    paymentsData.value = [{ associateUuid: 'p1', paymentMethod: 'cash' }]
    const { setPaymentMethod } = useAcceptancePickerPayments({ tournamentUuid: 't1' })
    setPaymentMethod(makeItem({ value: 'p1' }), 'pos')
    expect(setPayment.mutate).toHaveBeenCalledWith({
      associateUuid: 'p1', method: 'pos', receivedBy: undefined
    })
  })

  it('togglePaymentMethod clears the method when it matches the current one', () => {
    paymentsData.value = [{ associateUuid: 'p1', paymentMethod: 'cash' }]
    const { togglePaymentMethod } = useAcceptancePickerPayments({ tournamentUuid: 't1' })
    togglePaymentMethod(makeItem({ value: 'p1' }), 'cash')
    expect(setPayment.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ associateUuid: 'p1', method: null })
    )
  })

  it('togglePaymentMethod sets the method when it differs from the current one', () => {
    paymentsData.value = [{ associateUuid: 'p1', paymentMethod: 'cash' }]
    const { togglePaymentMethod } = useAcceptancePickerPayments({ tournamentUuid: 't1' })
    togglePaymentMethod(makeItem({ value: 'p1' }), 'pos')
    expect(setPayment.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ associateUuid: 'p1', method: 'pos' })
    )
  })

  it('toggleTestPayment marks a player as test-paid, then clears it on a second toggle', () => {
    const { toggleTestPayment, testPayments } = useAcceptancePickerPayments({ tournamentUuid: 't1' })
    const item = makeItem({ value: 'p1' })

    toggleTestPayment(item)
    expect(testPayments.value.p1).toBe(true)

    toggleTestPayment(item)
    expect(testPayments.value.p1).toBeUndefined()
  })

  it('toggleTestPayment clears an existing real payment first (mutually exclusive)', () => {
    paymentsData.value = [{ associateUuid: 'p1', paymentMethod: 'cash' }]
    const { toggleTestPayment, testPayments } = useAcceptancePickerPayments({ tournamentUuid: 't1' })
    toggleTestPayment(makeItem({ value: 'p1' }))
    expect(setPayment.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ associateUuid: 'p1', method: null })
    )
    expect(testPayments.value.p1).toBe(true)
  })

  it('toggleTestPaymentForTargets turns every target on when the anchor was off', () => {
    const { toggleTestPaymentForTargets, testPayments } = useAcceptancePickerPayments({ tournamentUuid: 't1' })
    const items = [makeItem({ value: 'p1' }), makeItem({ value: 'p2' })]
    toggleTestPaymentForTargets(items)
    expect(testPayments.value.p1).toBe(true)
    expect(testPayments.value.p2).toBe(true)
  })

  it('toggleTestPaymentForTargets turns every target off when the anchor was on', () => {
    const { toggleTestPaymentForTargets, testPayments } = useAcceptancePickerPayments({ tournamentUuid: 't1' })
    const items = [makeItem({ value: 'p1' }), makeItem({ value: 'p2' })]
    toggleTestPaymentForTargets(items)
    toggleTestPaymentForTargets(items)
    expect(testPayments.value.p1).toBeUndefined()
    expect(testPayments.value.p2).toBeUndefined()
  })

  it('toggleTestPaymentForTargets is a no-op for an empty selection', () => {
    const { toggleTestPaymentForTargets, testPayments } = useAcceptancePickerPayments({ tournamentUuid: 't1' })
    toggleTestPaymentForTargets([])
    expect(Object.keys(testPayments.value)).toHaveLength(0)
  })
})
