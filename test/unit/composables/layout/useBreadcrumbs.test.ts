// test\unit\composables\layout\useBreadcrumbs.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBreadcrumbs } from '~/composables/layout/useBreadcrumbs'

const can = vi.hoisted(() => vi.fn())

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
// Auto-imported by the composable, so mocked as a module rather than stubbed as a global
vi.mock('~/composables/useUserRole', () => ({ useUserRole: () => ({ can }) }))

// The pages' own `permission` meta, by path
const PERMISSIONS: Record<string, string> = { '/players': 'view-players' }

beforeEach(() => {
  can.mockReset().mockReturnValue(true)
  vi.stubGlobal('useRoute', () => ({ path: '/players/mario-rossi', query: {} }))
  vi.stubGlobal('useRouter', () => ({
    resolve: (to: string | { path: string }) => ({
      meta: { permission: PERMISSIONS[typeof to === 'string' ? to : to.path] }
    })
  }))
})

describe('useBreadcrumbs', () => {
  it('links every step when the user may open each page', () => {
    const { breadcrumbItems } = useBreadcrumbs()

    expect(breadcrumbItems.value.map(item => item.to)).toEqual(['/', '/players', '/players/mario-rossi'])
  })

  it('keeps a step the user cannot open as text, so it never leads to the 403 page', () => {
    can.mockImplementation(permission => permission !== 'view-players')
    const { breadcrumbItems } = useBreadcrumbs()

    const players = breadcrumbItems.value.find(item => item.label === 'player.breadcrumb')
    expect(players?.to).toBeUndefined()
    expect(breadcrumbItems.value.filter(item => item.to).map(item => item.to))
      .toEqual(['/', '/players/mario-rossi'])
  })

  it('asks for the permission the page declares', () => {
    const { breadcrumbItems } = useBreadcrumbs()
    expect(breadcrumbItems.value.length).toBeGreaterThan(0)

    expect(can).toHaveBeenCalledWith('view-players')
  })
})
