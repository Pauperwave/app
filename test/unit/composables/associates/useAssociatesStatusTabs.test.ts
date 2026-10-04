// test\unit\composables\associates\useAssociatesStatusTabs.test.ts
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssociatesStatusTabs } from '~/composables/associates/useAssociatesStatusTabs'
import type { Associate } from '~/types'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const replace = vi.fn()
const route = reactive<{ query: Record<string, unknown> }>({ query: {} })

beforeEach(() => {
  replace.mockClear()
  route.query = {}
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('useRouter', () => ({ replace }))
})

const associate = (membership_status: string) => ({ membership_status }) as unknown as Associate

function mountTabs(
  roster: Associate[] = [],
  pendingRenewals: Set<string> | undefined = undefined
) {
  let exposed: ReturnType<typeof useAssociatesStatusTabs> | undefined
  const Component = defineComponent({
    setup() {
      exposed = useAssociatesStatusTabs(ref(roster), ref(pendingRenewals))
      return () => h('div')
    }
  })
  mount(Component)
  return exposed!
}

describe('the column filters', () => {
  it('start from the status in the URL once mounted', () => {
    route.query = { status: 'expired' }

    const { columnFilters } = mountTabs()

    expect(columnFilters.value).toEqual([{ id: 'membership_status', value: 'expired' }])
  })

  it('are empty without a status', () => {
    const { columnFilters } = mountTabs()

    expect(columnFilters.value).toEqual([])
  })

  it('follow the status when it changes', async () => {
    const { columnFilters } = mountTabs()

    route.query = { status: 'active' }
    await nextTick()
    expect(columnFilters.value).toEqual([{ id: 'membership_status', value: 'active' }])

    route.query = {}
    await nextTick()
    expect(columnFilters.value).toEqual([])
  })

  it('swap the pending renewal filter for the status one in a single step', async () => {
    route.query = { status: 'pending_renewal' }
    const { columnFilters } = mountTabs()
    expect(columnFilters.value).toEqual([{ id: 'has_pending_renewal', value: true }])

    route.query = { status: 'active' }
    await nextTick()

    expect(columnFilters.value).toEqual([{ id: 'membership_status', value: 'active' }])
  })
})

describe('the active tab', () => {
  it('is "all" without a status, and the status otherwise', () => {
    const { activeStatusTab } = mountTabs()
    expect(activeStatusTab.value).toBe('all')

    route.query = { status: 'to_renew' }
    expect(activeStatusTab.value).toBe('to_renew')
  })

  it('puts the picked tab in the URL, keeping the rest of the query', () => {
    route.query = { search: 'ada' }
    const { activeStatusTab } = mountTabs()

    activeStatusTab.value = 'expired'

    expect(replace).toHaveBeenCalledWith({ query: { search: 'ada', status: 'expired' } })
  })

  it('takes "all" out of the URL', () => {
    route.query = { status: 'expired' }
    const { activeStatusTab } = mountTabs()

    activeStatusTab.value = 'all'

    expect(replace).toHaveBeenCalledWith({ query: { status: undefined } })
  })
})

describe('the status tabs', () => {
  it('start with "all", without a count, then the four statuses in lifecycle order', () => {
    const { statusTabs } = mountTabs()

    expect(statusTabs.value.map(tab => tab.value)).toEqual([
      'all', 'active', 'pending_renewal', 'to_renew', 'expired'
    ])
    expect(statusTabs.value[0]!.count).toBeUndefined()
  })

  it('count the roster by status, and the pending renewals from their own set', () => {
    const { statusTabs } = mountTabs(
      [associate('active'), associate('active'), associate('to_renew'), associate('expired')],
      new Set(['u1', 'u2', 'u3'])
    )
    const count = (value: string) => statusTabs.value.find(tab => tab.value === value)?.count

    expect(count('active')).toBe(2)
    expect(count('to_renew')).toBe(1)
    expect(count('expired')).toBe(1)
    expect(count('pending_renewal')).toBe(3)
  })

  it('have no pending renewal count until the set is loaded', () => {
    const { statusTabs } = mountTabs([], undefined)

    expect(statusTabs.value.find(tab => tab.value === 'pending_renewal')?.count).toBeUndefined()
  })

  it('give every status tab an icon', () => {
    const { statusTabs } = mountTabs()

    for (const tab of statusTabs.value.slice(1)) {
      expect('icon' in tab && tab.icon, tab.value).toBeTruthy()
    }
  })
})
