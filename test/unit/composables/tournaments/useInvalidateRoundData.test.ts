// test\unit\composables\tournaments\useInvalidateRoundData.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useInvalidateRoundData } from '~/composables/tournaments/rounds/useInvalidateRoundData'

const invalidateQueries = vi.fn()

vi.mock('@pinia/colada', () => ({ useQueryCache: () => ({ invalidateQueries }) }))

describe('useInvalidateRoundData', () => {
  beforeEach(() => invalidateQueries.mockClear())

  it('invalidates tournaments, rounds, pairings and the format results key', () => {
    const invalidate = useInvalidateRoundData('t1', uuid => ['format-results', uuid])

    invalidate()

    const keys = invalidateQueries.mock.calls.map(([options]) => options.key)
    expect(keys).toEqual([
      ['tournaments'],
      ['tournament-rounds', 't1'],
      ['tournament-pairings', 't1'],
      ['format-results', 't1']
    ])
  })

  it('reads the tournament uuid at call time', () => {
    const uuid = ref('t1')
    const invalidate = useInvalidateRoundData(uuid, id => ['format-results', id])

    uuid.value = 't2'
    invalidate()

    expect(invalidateQueries).toHaveBeenCalledWith({ key: ['format-results', 't2'] })
  })
})
