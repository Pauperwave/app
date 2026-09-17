// test\unit\composables\tournaments\registration\useAcceptancePickerRowActions.test.ts
import { computed, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useAcceptancePickerRowActions } from '~/composables/tournaments/registration/useAcceptancePickerRowActions'
import type { AcceptancePickerItem } from '~/components/tournaments/single/AcceptancePicker.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const isDeveloperView = ref(true)
vi.mock('~/composables/useDeveloperView', () => ({
  useDeveloperView: () => ({ isDeveloperView })
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

function makeSut(overrides: Partial<{
  sourceRowStatus: (item: AcceptancePickerItem) => 'pending' | 'accepted' | 'noShow'
  sourceSelection: AcceptancePickerItem[]
  selectedAccepted: AcceptancePickerItem[]
  paymentMethodByPlayer: Record<string, string | null>
  testPayments: Record<string, boolean>
}>) {
  const transferToAccepted = vi.fn()
  const setNoShow = vi.fn()
  const setPaymentMethod = vi.fn()
  const toggleTestPaymentForTargets = vi.fn()
  const requestRemoveAcceptedTargets = vi.fn()

  const result = useAcceptancePickerRowActions({
    sourceRowStatus: overrides.sourceRowStatus ?? (() => 'pending'),
    sourceSelection: computed(() => overrides.sourceSelection ?? []),
    transferToAccepted,
    setNoShow,
    selectedAccepted: computed(() => overrides.selectedAccepted ?? []),
    paymentMethodByPlayer: overrides.paymentMethodByPlayer ?? {},
    paymentMethodOptions: ['Cash', 'POS', 'Comped'] as never[],
    paymentMethodLabel: option => `label:${option}`,
    setPaymentMethod,
    testPayments: overrides.testPayments ?? {},
    toggleTestPaymentForTargets,
    requestRemoveAcceptedTargets
  })

  return {
    ...result,
    transferToAccepted, setNoShow, setPaymentMethod, toggleTestPaymentForTargets,
    requestRemoveAcceptedTargets
  }
}

describe('useAcceptancePickerRowActions', () => {
  describe('source ("Pre-registrati") side', () => {
    it('is empty for an already-accepted row', () => {
      const sut = makeSut({ sourceRowStatus: () => 'accepted' })
      const item = makeItem({ value: 'p1' })
      sut.onSourceRowContextmenu(new Event('contextmenu'), { original: item })
      expect(sut.sourceTableContextMenuItems.value).toEqual([])
    })

    it('offers "add to accepted" only for a pending row, not a no-show one', () => {
      const pending = makeSut({ sourceRowStatus: () => 'pending' })
      const item = makeItem({ value: 'p1' })
      pending.onSourceRowContextmenu(new Event('contextmenu'), { original: item })
      const pendingLabels = pending.sourceTableContextMenuItems.value
        .filter(i => 'label' in i).map(i => 'label' in i && i.label)
      expect(pendingLabels).toContain('tournament.single.acceptancePicker.addToAcceptedMenuLabel')

      const noShow = makeSut({ sourceRowStatus: () => 'noShow' })
      noShow.onSourceRowContextmenu(new Event('contextmenu'), { original: item })
      const noShowLabels = noShow.sourceTableContextMenuItems.value
        .filter(i => 'label' in i).map(i => 'label' in i && i.label)
      expect(noShowLabels).not.toContain('tournament.single.acceptancePicker.addToAcceptedMenuLabel')
    })

    it('acts on the whole selection when the clicked row is part of a multi-row selection', () => {
      const item1 = makeItem({ value: 'p1' })
      const item2 = makeItem({ value: 'p2' })
      const sut = makeSut({ sourceRowStatus: () => 'pending', sourceSelection: [item1, item2] })
      sut.onSourceRowContextmenu(new Event('contextmenu'), { original: item1 })

      const noShowItem = sut.sourceTableContextMenuItems.value
        .find(i => 'label' in i && i.label === 'tournament.single.acceptancePicker.markNoShowMenuLabelBulk')
      expect(noShowItem && 'onSelect' in noShowItem ? noShowItem.onSelect?.(new Event('select')) : undefined)
      expect(sut.setNoShow).toHaveBeenCalledWith([item1, item2], true)
    })

    it('acts on just the clicked row when it is not part of the current selection', () => {
      const item1 = makeItem({ value: 'p1' })
      const item2 = makeItem({ value: 'p2' })
      const other = makeItem({ value: 'p3' })
      const sut = makeSut({ sourceRowStatus: () => 'pending', sourceSelection: [item1, item2] })
      sut.onSourceRowContextmenu(new Event('contextmenu'), { original: other })

      const noShowItem = sut.sourceTableContextMenuItems.value
        .find(i => 'label' in i && i.label === 'tournament.single.acceptancePicker.markNoShowMenuLabel')
      expect(noShowItem && 'onSelect' in noShowItem ? noShowItem.onSelect?.(new Event('select')) : undefined)
      expect(sut.setNoShow).toHaveBeenCalledWith([other], true)
    })

    it('toggles off no-show for an already no-show row', () => {
      const sut = makeSut({ sourceRowStatus: () => 'noShow' })
      const item = makeItem({ value: 'p1' })
      sut.onSourceRowContextmenu(new Event('contextmenu'), { original: item })
      const unmark = sut.sourceTableContextMenuItems.value
        .find(i => 'label' in i && i.label === 'tournament.single.acceptancePicker.unmarkNoShowMenuLabel')
      expect(unmark && 'onSelect' in unmark ? unmark.onSelect?.(new Event('select')) : undefined)
      expect(sut.setNoShow).toHaveBeenCalledWith([item], false)
    })
  })

  describe('accepted ("Iscritti Pagato") side', () => {
    it('marks the current payment method with its badge color', () => {
      const sut = makeSut({ paymentMethodByPlayer: { p1: 'Cash' } })
      const item = makeItem({ value: 'p1' })
      sut.onAcceptedRowContextmenu(new Event('contextmenu'), { original: item })
      const cashItem = sut.acceptedTableContextMenuItems.value
        .find(i => 'label' in i && i.label === 'label:Cash')
      expect(cashItem && 'color' in cashItem ? cashItem.color : undefined).toBeDefined()
    })

    it('setPaymentMethod toggles off the method when re-selecting the current one', () => {
      const sut = makeSut({ paymentMethodByPlayer: { p1: 'Cash' } })
      const item = makeItem({ value: 'p1' })
      sut.onAcceptedRowContextmenu(new Event('contextmenu'), { original: item })
      const cashItem = sut.acceptedTableContextMenuItems.value
        .find(i => 'label' in i && i.label === 'label:Cash')
      expect(cashItem && 'onSelect' in cashItem ? cashItem.onSelect?.(new Event('select')) : undefined)
      expect(sut.setPaymentMethod).toHaveBeenCalledWith(item, null)
    })

    it('shows the "test payment" entry only when developer view is on', () => {
      isDeveloperView.value = true
      const withDev = makeSut({})
      const item = makeItem({ value: 'p1' })
      withDev.onAcceptedRowContextmenu(new Event('contextmenu'), { original: item })
      const devLabels = withDev.acceptedTableContextMenuItems.value
        .filter(i => 'label' in i).map(i => 'label' in i && i.label)
      expect(devLabels).toContain('tournament.single.acceptancePicker.testPaymentLabel')

      isDeveloperView.value = false
      const withoutDev = makeSut({})
      withoutDev.onAcceptedRowContextmenu(new Event('contextmenu'), { original: item })
      const noDevLabels = withoutDev.acceptedTableContextMenuItems.value
        .filter(i => 'label' in i).map(i => 'label' in i && i.label)
      expect(noDevLabels).not.toContain('tournament.single.acceptancePicker.testPaymentLabel')
    })

    it('remove is bulk-labeled and targets the whole selection when the row is part of one', () => {
      const item1 = makeItem({ value: 'p1' })
      const item2 = makeItem({ value: 'p2' })
      const sut = makeSut({ selectedAccepted: [item1, item2] })
      sut.onAcceptedRowContextmenu(new Event('contextmenu'), { original: item1 })
      const remove = sut.acceptedTableContextMenuItems.value
        .find(i => 'label' in i && i.label === 'tournament.single.acceptancePicker.removeActionBulk')
      expect(remove && 'onSelect' in remove ? remove.onSelect?.(new Event('select')) : undefined)
      expect(sut.requestRemoveAcceptedTargets).toHaveBeenCalledWith([item1, item2])
    })
  })
})
