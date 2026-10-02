// test\unit\utils\podiumStyle.test.ts
import { describe, expect, it } from 'vitest'
import { podiumStyle } from '~/utils/tournaments/podiumStyle'
import { ICONS } from '~/utils/icons'

describe('podiumStyle', () => {
  it('uses a medal for every placement, never a crown', () => {
    for (const position of [1, 2, 3, 4, 5]) {
      expect(podiumStyle(position).icon).toBe(ICONS.medal)
    }
  })

  it('gives 1st, 2nd and 3rd each their own color', () => {
    const classes = [1, 2, 3].map(position => podiumStyle(position).badgeClass)
    expect(new Set(classes).size).toBe(3)
    expect(podiumStyle(1).textClass).toContain('text-warning')
  })

  it('keeps everyone off the podium on one plain style, distinct from 2nd', () => {
    expect(podiumStyle(4)).toEqual(podiumStyle(0))
    expect(podiumStyle(4).badgeClass).not.toBe(podiumStyle(2).badgeClass)
  })
})
