// test\unit\composables\useModalOpenFromQuery.test.ts
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useModalOpenFromQuery } from '~/composables/useModalOpenFromQuery'

function mountWithQuery(query: Record<string, string>) {
  const replace = vi.fn()
  vi.stubGlobal('useRoute', () => ({ query }))
  vi.stubGlobal('useRouter', () => ({ replace }))

  let exposed: ReturnType<typeof useModalOpenFromQuery> | undefined
  const Component = defineComponent({
    setup() {
      exposed = useModalOpenFromQuery()
      return () => h('div')
    }
  })
  mount(Component)
  return { exposed: exposed!, replace }
}

describe('useModalOpenFromQuery', () => {
  it('opens the modal and clears the query when action=create', () => {
    const { exposed, replace } = mountWithQuery({ action: 'create' })
    expect(exposed.isModalOpen.value).toBe(true)
    expect(replace).toHaveBeenCalledWith({ query: {} })
  })

  it('leaves the modal closed for any other query', () => {
    const { exposed, replace } = mountWithQuery({ action: 'edit' })
    expect(exposed.isModalOpen.value).toBe(false)
    expect(replace).not.toHaveBeenCalled()
  })

  it('leaves the modal closed with no query at all', () => {
    const { exposed, replace } = mountWithQuery({})
    expect(exposed.isModalOpen.value).toBe(false)
    expect(replace).not.toHaveBeenCalled()
  })
})
