// test\unit\composables\events\useEventsRowActions.test.ts
import { describe, expect, it } from 'vitest'
import { useEventsRowActions } from '~/composables/events/useEventsRowActions'
import type { Event } from '~/types'

describe('useEventsRowActions', () => {
  it('starts with no editing event and the modal closed', () => {
    const { editingEvent, editModalOpen } = useEventsRowActions()
    expect(editingEvent.value).toBeNull()
    expect(editModalOpen.value).toBe(false)
  })

  it('openEditModal sets the editing event and opens the modal', () => {
    const { openEditModal, editingEvent, editModalOpen } = useEventsRowActions()
    const event = { uuid: 'e1' } as Event
    openEditModal(event)
    expect(editingEvent.value).toEqual(event)
    expect(editModalOpen.value).toBe(true)
  })
})
