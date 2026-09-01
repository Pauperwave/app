// test\unit\composables\tournaments\useTournamentsRowActions.test.ts
import { describe, expect, it } from 'vitest'
import { useTournamentsRowActions } from '~/composables/tournaments/useTournamentsRowActions'
import type { Tournament } from '~/types'

describe('useTournamentsRowActions', () => {
  it('starts with no editing tournament and the modal closed', () => {
    const { editingTournament, editModalOpen } = useTournamentsRowActions()
    expect(editingTournament.value).toBeNull()
    expect(editModalOpen.value).toBe(false)
  })

  it('openEditModal sets the editing tournament and opens the modal', () => {
    const { openEditModal, editingTournament, editModalOpen } = useTournamentsRowActions()
    const tournament = { uuid: 't1' } as Tournament
    openEditModal(tournament)
    expect(editingTournament.value).toEqual(tournament)
    expect(editModalOpen.value).toBe(true)
  })
})
