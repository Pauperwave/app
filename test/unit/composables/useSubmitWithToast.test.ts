// test\unit\composables\useSubmitWithToast.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSubmitWithToast } from '~/composables/useSubmitWithToast'

describe('useSubmitWithToast', () => {
  const toastAdd = vi.fn()

  beforeEach(() => {
    toastAdd.mockClear()
    vi.stubGlobal('useToast', () => ({ add: toastAdd }))
  })

  it('toasts success and calls onSuccess when the action resolves', async () => {
    const { submitting, submitWithToast } = useSubmitWithToast()
    const onSuccess = vi.fn()

    const promise = submitWithToast(() => Promise.resolve(), {
      successTitle: 'Saved',
      successDescription: 'All good',
      errorTitle: 'Failed',
      onSuccess
    })
    expect(submitting.value).toBe(true)
    await promise

    expect(submitting.value).toBe(false)
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Saved', description: 'All good', color: 'success' })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('toasts an error and does not call onSuccess when the action rejects', async () => {
    const { submitting, submitWithToast } = useSubmitWithToast()
    const onSuccess = vi.fn()

    await submitWithToast(() => Promise.reject(new Error('boom')), {
      successTitle: 'Saved',
      errorTitle: 'Failed',
      onSuccess
    })

    expect(submitting.value).toBe(false)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Failed', color: 'error' }))
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
