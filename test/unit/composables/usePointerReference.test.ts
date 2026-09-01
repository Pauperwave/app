// test\unit\composables\usePointerReference.test.ts
import { describe, expect, it } from 'vitest'
import { usePointerReference } from '~/composables/usePointerReference'

describe('usePointerReference', () => {
  it('starts anchored at the origin', () => {
    const { reference } = usePointerReference()
    const rect = reference.value.getBoundingClientRect()
    expect(rect.left).toBe(0)
    expect(rect.top).toBe(0)
  })

  it('reference tracks the anchor reactively', () => {
    const { anchor, reference } = usePointerReference()
    anchor.value = { x: 120, y: 40 }
    const rect = reference.value.getBoundingClientRect()
    expect(rect.left).toBe(120)
    expect(rect.right).toBe(120)
    expect(rect.top).toBe(40)
    expect(rect.bottom).toBe(40)
  })

  it('the virtual rect always has zero width/height', () => {
    const { anchor, reference } = usePointerReference()
    anchor.value = { x: 50, y: 50 }
    const rect = reference.value.getBoundingClientRect()
    expect(rect.width).toBe(0)
    expect(rect.height).toBe(0)
  })
})
