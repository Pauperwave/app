// test\unit\composables\useChangeFlash.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChangeFlash } from '~/composables/useChangeFlash'

function setup(initial: Array<{ key: string, value: number }>, duration?: number) {
  const items = ref(initial)
  const { flashes } = useChangeFlash(items, duration)
  return { items, flashes }
}

describe('useChangeFlash', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not flash anything for the first values', () => {
    const { flashes } = setup([{ key: 'a', value: 3 }])
    expect(flashes.value).toEqual({})
  })

  it('flags an increase as a gain and a decrease as a loss', async () => {
    const { items, flashes } = setup([{ key: 'a', value: 3 }, { key: 'b', value: 5 }])

    items.value = [{ key: 'a', value: 4 }, { key: 'b', value: 4 }]
    await nextTick()

    expect(flashes.value).toEqual({ a: 'gain', b: 'loss' })
  })

  it('leaves the unchanged items out', async () => {
    const { items, flashes } = setup([{ key: 'a', value: 3 }, { key: 'b', value: 5 }])

    items.value = [{ key: 'a', value: 3 }, { key: 'b', value: 6 }]
    await nextTick()

    expect(flashes.value).toEqual({ b: 'gain' })
  })

  it('does not flash an item seen for the first time', async () => {
    const { items, flashes } = setup([{ key: 'a', value: 3 }])

    items.value = [{ key: 'a', value: 3 }, { key: 'b', value: 9 }]
    await nextTick()

    expect(flashes.value).toEqual({})
  })

  it('clears the flashes after the duration', async () => {
    const { items, flashes } = setup([{ key: 'a', value: 3 }], 500)

    items.value = [{ key: 'a', value: 4 }]
    await nextTick()
    expect(flashes.value).toEqual({ a: 'gain' })

    vi.advanceTimersByTime(499)
    expect(flashes.value).toEqual({ a: 'gain' })

    vi.advanceTimersByTime(1)
    expect(flashes.value).toEqual({})
  })

  it('restarts the countdown when another change comes in', async () => {
    const { items, flashes } = setup([{ key: 'a', value: 3 }], 500)

    items.value = [{ key: 'a', value: 4 }]
    await nextTick()
    vi.advanceTimersByTime(400)

    items.value = [{ key: 'a', value: 5 }]
    await nextTick()
    vi.advanceTimersByTime(400)

    expect(flashes.value).toEqual({ a: 'gain' })
    vi.advanceTimersByTime(100)
    expect(flashes.value).toEqual({})
  })
})
