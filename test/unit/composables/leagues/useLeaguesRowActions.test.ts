// test\unit\composables\leagues\useLeaguesRowActions.test.ts
import { describe, expect, it } from 'vitest'
import { useLeaguesRowActions } from '~/composables/leagues/useLeaguesRowActions'
import type { League } from '~/types'

describe('useLeaguesRowActions', () => {
  it('starts with no editing league and the modal closed', () => {
    const { editingLeague, editModalOpen } = useLeaguesRowActions()
    expect(editingLeague.value).toBeNull()
    expect(editModalOpen.value).toBe(false)
  })

  it('openEditModal sets the editing league and opens the modal', () => {
    const { openEditModal, editingLeague, editModalOpen } = useLeaguesRowActions()
    const league = { uuid: 'l1' } as League
    openEditModal(league)
    expect(editingLeague.value).toEqual(league)
    expect(editModalOpen.value).toBe(true)
  })
})
