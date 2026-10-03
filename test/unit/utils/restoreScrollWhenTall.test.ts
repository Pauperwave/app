// test\unit\utils\restoreScrollWhenTall.test.ts
import { describe, expect, it } from 'vitest'
import { restoreScrollWhenTall } from '~/utils/restoreScrollWhenTall'

function createHarness(maxWaitMs = 3000) {
  const frames: (() => void)[] = []
  let time = 0
  const target = { scrollTop: 0, scrollHeight: 500, clientHeight: 500 }

  return {
    target,
    start: (top: number, getTarget: () => typeof target | null = () => target) =>
      restoreScrollWhenTall(getTarget, top, {
        maxWaitMs,
        now: () => time,
        schedule: callback => frames.push(callback)
      }),
    // Runs the next scheduled frame, `elapsed` ms after the previous one
    step(elapsed = 16) {
      time += elapsed
      frames.shift()?.()
    },
    pending: () => frames.length
  }
}

describe('restoreScrollWhenTall', () => {
  it('scrolls right away when the content is already tall enough', () => {
    const harness = createHarness()
    harness.target.scrollHeight = 2000

    harness.start(800)
    harness.step()

    expect(harness.target.scrollTop).toBe(800)
  })

  it('waits for the content to grow, then scrolls', () => {
    const harness = createHarness()
    harness.start(800)

    harness.step()
    expect(harness.target.scrollTop).toBe(0)

    harness.target.scrollHeight = 2000
    harness.step()
    expect(harness.target.scrollTop).toBe(800)
  })

  it('waits for the element itself to exist', () => {
    const harness = createHarness()
    let target: typeof harness.target | null = null
    harness.start(100, () => target)

    harness.step()
    target = harness.target
    harness.target.scrollHeight = 2000
    harness.step()

    expect(harness.target.scrollTop).toBe(100)
  })

  it('gives up after the max wait', () => {
    const harness = createHarness(100)
    harness.start(800)

    harness.step(50)
    harness.step(60)

    expect(harness.target.scrollTop).toBe(0)
    expect(harness.pending()).toBe(0)
  })

  it('leaves the position alone once the user has scrolled', () => {
    const harness = createHarness()
    harness.start(800)

    harness.target.scrollTop = 30
    harness.target.scrollHeight = 2000
    harness.step()

    expect(harness.target.scrollTop).toBe(30)
    expect(harness.pending()).toBe(0)
  })
})
