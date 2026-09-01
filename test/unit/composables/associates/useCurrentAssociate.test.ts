// test\unit\composables\associates\useCurrentAssociate.test.ts
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentAssociate } from '~/composables/associates/useCurrentAssociate'
import type { Associate } from '~/types'

const associates = ref<Associate[]>([])
const authUser = ref<{ email?: string } | null>(null)

vi.mock('~/composables/associates/useAssociatesQuery', () => ({
  useAssociatesQuery: () => ({ data: associates })
}))

describe('useCurrentAssociate', () => {
  beforeEach(() => {
    vi.stubGlobal('useSupabaseUser', () => authUser)
  })

  it('resolves the associate whose email matches the logged-in user', () => {
    authUser.value = { email: 'alice@example.com' }
    associates.value = [
      { email_address: 'bob@example.com' } as Associate,
      { email_address: 'alice@example.com' } as Associate
    ]
    const currentAssociate = useCurrentAssociate()
    expect(currentAssociate.value?.email_address).toBe('alice@example.com')
  })

  it('is null when no associate matches the logged-in user\'s email', () => {
    authUser.value = { email: 'nobody@example.com' }
    associates.value = [{ email_address: 'bob@example.com' } as Associate]
    const currentAssociate = useCurrentAssociate()
    expect(currentAssociate.value).toBeNull()
  })

  it('is null when there is no logged-in user', () => {
    authUser.value = null
    associates.value = [{ email_address: 'bob@example.com' } as Associate]
    const currentAssociate = useCurrentAssociate()
    expect(currentAssociate.value).toBeNull()
  })
})
