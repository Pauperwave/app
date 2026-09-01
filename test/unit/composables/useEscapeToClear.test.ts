// test\unit\composables\useEscapeToClear.test.ts
import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useEscapeToClear } from '~/composables/useEscapeToClear'

function pressEscape(target: EventTarget = window, overrides: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...overrides })
  target.dispatchEvent(event)
}

// useEventListener (vueuse) registers via onMounted/onScopeDispose — needs an
// active effect scope to attach the listener at all outside a component.
function withScope(setup: () => void) {
  const scope = effectScope()
  scope.run(setup)
  return () => scope.stop()
}

describe('useEscapeToClear', () => {
  it('clears when Escape is pressed while something is selected', () => {
    const clear = vi.fn()
    const stop = withScope(() => useEscapeToClear(() => true, clear))
    pressEscape()
    expect(clear).toHaveBeenCalledTimes(1)
    stop()
  })

  it('does nothing when there is no selection to clear', () => {
    const clear = vi.fn()
    const stop = withScope(() => useEscapeToClear(() => false, clear))
    pressEscape()
    expect(clear).not.toHaveBeenCalled()
    stop()
  })

  it('ignores Escape while focused in a text input', () => {
    const clear = vi.fn()
    const stop = withScope(() => useEscapeToClear(() => true, clear))
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(clear).not.toHaveBeenCalled()
    input.remove()
    stop()
  })

  it('ignores Escape combined with a modifier key', () => {
    const clear = vi.fn()
    const stop = withScope(() => useEscapeToClear(() => true, clear))
    pressEscape(window, { metaKey: true })
    expect(clear).not.toHaveBeenCalled()
    stop()
  })

  it('ignores keys other than Escape', () => {
    const clear = vi.fn()
    const stop = withScope(() => useEscapeToClear(() => true, clear))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(clear).not.toHaveBeenCalled()
    stop()
  })
})
