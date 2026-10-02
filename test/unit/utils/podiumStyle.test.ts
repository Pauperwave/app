// test\unit\utils\podiumStyle.test.ts
import { describe, expect, it } from 'vitest'
import { podiumStyle } from '~/utils/tournaments/podiumStyle'
import { ICONS } from '~/utils/icons'

describe('podiumStyle', () => {
  it('crowns the winner in gold', () => {
    expect(podiumStyle(1).icon).toBe(ICONS.crown)
    expect(podiumStyle(1).textClass).toContain('text-warning')
  })

  it('gives 2nd and 3rd a medal each, in different colors', () => {
    expect(podiumStyle(2).icon).toBe(ICONS.medal)
    expect(podiumStyle(3).icon).toBe(ICONS.medal)
    expect(podiumStyle(2).badgeClass).not.toBe(podiumStyle(3).badgeClass)
  })

  it('shows everyone off the podium with the same muted medal', () => {
    expect(podiumStyle(4)).toEqual(podiumStyle(0))
    expect(podiumStyle(4).textClass).toBe('text-muted')
  })
})
