// test\unit\utils\permissions.test.ts
import { describe, expect, it } from 'vitest'
import { can } from '~/utils/permissions'

describe('can', () => {
  it('denies when role is undefined', () => {
    expect(can(undefined, 'register-tournament')).toBe(false)
  })

  it('allows a role exactly at the required level', () => {
    expect(can('organizer', 'manage-tournaments')).toBe(true)
  })

  it('allows a role above the required level', () => {
    expect(can('super_admin', 'register-tournament')).toBe(true)
  })

  it('denies a role below the required level', () => {
    expect(can('player', 'manage-tournaments')).toBe(false)
    expect(can('organizer', 'manage-members')).toBe(false)
    expect(can('admin', 'purge-trash')).toBe(false)
  })

  it('the hierarchy is strictly increasing: super_admin can do everything an admin can', () => {
    expect(can('super_admin', 'manage-roles')).toBe(true)
    expect(can('super_admin', 'purge-trash')).toBe(true)
  })
})
