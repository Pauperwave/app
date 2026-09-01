// test\unit\composables\tournaments\useTournamentCopyModal.test.ts
import { describe, expect, it } from 'vitest'
import { useTournamentCopyModal } from '~/composables/tournaments/useTournamentCopyModal'
import type { Tournament } from '~/types'

describe('useTournamentCopyModal', () => {
  it('starts closed with no source tournament', () => {
    const { copyModalOpen, copySourceTournament } = useTournamentCopyModal()
    expect(copyModalOpen.value).toBe(false)
    expect(copySourceTournament.value).toBeNull()
  })

  it('opening the modal sets the source tournament and opens it', () => {
    const { copyModalOpen, copySourceTournament, openCopyModal } = useTournamentCopyModal()
    const tournament = { uuid: 't1' } as Tournament
    openCopyModal(tournament)
    expect(copyModalOpen.value).toBe(true)
    expect(copySourceTournament.value).toBe(tournament)
  })
})
