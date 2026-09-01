// test\unit\composables\locations\useLocationsRowActions.test.ts
import { describe, expect, it } from 'vitest'
import { useLocationsRowActions } from '~/composables/locations/useLocationsRowActions'
import type { Location } from '~/types'

describe('useLocationsRowActions', () => {
  it('starts with no editing location and the modal closed', () => {
    const { editingLocation, editModalOpen } = useLocationsRowActions()
    expect(editingLocation.value).toBeNull()
    expect(editModalOpen.value).toBe(false)
  })

  it('openEditModal sets the editing location and opens the modal', () => {
    const { openEditModal, editingLocation, editModalOpen } = useLocationsRowActions()
    const location = { uuid: 'loc1' } as Location
    openEditModal(location)
    expect(editingLocation.value).toEqual(location)
    expect(editModalOpen.value).toBe(true)
  })
})
