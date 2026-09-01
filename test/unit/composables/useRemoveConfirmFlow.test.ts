// test\unit\composables\useRemoveConfirmFlow.test.ts
import { describe, expect, it, vi } from 'vitest'
import { useRemoveConfirmFlow } from '~/composables/useRemoveConfirmFlow'

interface Item { id: number, name: string }

// useI18n is a real import from 'vue-i18n' (in vitest.config.ts's AutoImport
// preset list), not a bare Nuxt-runtime global — vi.stubGlobal can't
// intercept it, the module itself has to be mocked.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}(${JSON.stringify(params)})` : key
  })
}))

describe('useRemoveConfirmFlow', () => {
  it('is closed with no pending items initially', () => {
    const flow = useRemoveConfirmFlow<Item>({
      onConfirm: vi.fn(),
      getLabel: item => item.name,
      titleKey: 'title',
      descriptionKey: 'description.single',
      descriptionBatchKey: 'description.batch'
    })
    expect(flow.isOpen.value).toBe(false)
    expect(flow.description.value).toBeUndefined()
  })

  it('requesting items opens the flow and picks the single-item description', () => {
    const flow = useRemoveConfirmFlow<Item>({
      onConfirm: vi.fn(),
      getLabel: item => item.name,
      titleKey: 'title',
      descriptionKey: 'description.single',
      descriptionBatchKey: 'description.batch'
    })
    flow.request([{ id: 1, name: 'Alice' }])
    expect(flow.isOpen.value).toBe(true)
    expect(flow.description.value).toBe('description.single({"name":"Alice"})')
  })

  it('requesting more than one item picks the batch description', () => {
    const flow = useRemoveConfirmFlow<Item>({
      onConfirm: vi.fn(),
      getLabel: item => item.name,
      titleKey: 'title',
      descriptionKey: 'description.single',
      descriptionBatchKey: 'description.batch'
    })
    flow.request([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }])
    expect(flow.description.value).toBe('description.batch({"count":2})')
  })

  it('requesting an empty array does not open the flow', () => {
    const flow = useRemoveConfirmFlow<Item>({
      onConfirm: vi.fn(),
      getLabel: item => item.name,
      titleKey: 'title',
      descriptionKey: 'description.single',
      descriptionBatchKey: 'description.batch'
    })
    flow.request([])
    expect(flow.isOpen.value).toBe(false)
  })

  it('confirm runs onConfirm with the pending items and closes the flow', () => {
    const onConfirm = vi.fn()
    const flow = useRemoveConfirmFlow<Item>({
      onConfirm,
      getLabel: item => item.name,
      titleKey: 'title',
      descriptionKey: 'description.single',
      descriptionBatchKey: 'description.batch'
    })
    const items = [{ id: 1, name: 'Alice' }]
    flow.request(items)
    flow.confirm()
    expect(onConfirm).toHaveBeenCalledWith(items)
    expect(flow.isOpen.value).toBe(false)
  })

  it('setting isOpen to false clears the pending items', () => {
    const flow = useRemoveConfirmFlow<Item>({
      onConfirm: vi.fn(),
      getLabel: item => item.name,
      titleKey: 'title',
      descriptionKey: 'description.single',
      descriptionBatchKey: 'description.batch'
    })
    flow.request([{ id: 1, name: 'Alice' }])
    flow.isOpen.value = false
    expect(flow.description.value).toBeUndefined()
  })
})
