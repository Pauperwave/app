// test\unit\composables\useLogout.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLogout } from '~/composables/useLogout'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

describe('useLogout', () => {
  const toastAdd = vi.fn()
  const navigateTo = vi.fn()
  const signOut = vi.fn()

  beforeEach(() => {
    toastAdd.mockClear()
    navigateTo.mockClear()
    signOut.mockClear()
    vi.stubGlobal('useToast', () => ({ add: toastAdd }))
    vi.stubGlobal('navigateTo', navigateTo)
    vi.stubGlobal('useSupabaseClient', () => ({ auth: { signOut } }))
  })

  it('toasts success and redirects to /login when signOut succeeds', async () => {
    signOut.mockResolvedValue({ error: null })
    const logout = useLogout()
    await logout()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(navigateTo).toHaveBeenCalledWith('/login')
  })

  it('toasts an error and does not redirect when signOut returns an error', async () => {
    signOut.mockResolvedValue({ error: new Error('nope') })
    const logout = useLogout()
    await logout()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('toasts an error when signOut itself throws', async () => {
    signOut.mockRejectedValue(new Error('network down'))
    const logout = useLogout()
    await logout()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
