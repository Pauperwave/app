// test\unit\composables\useFormatColor.test.ts
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useFormatColor } from '~/composables/useFormatColor'

const formats = ref<{ name: string, color: string | null }[]>([])

vi.mock('~/composables/mtgFormats/useMtgFormatsQuery', () => ({
  useMtgFormatsQuery: () => ({ data: formats })
}))

describe('useFormatColor', () => {
  it('uses the format\'s own db color when set', () => {
    formats.value = [{ name: 'Pauper', color: '#123456' }]
    const { formatColor, formatColorClass } = useFormatColor()
    expect(formatColor('Pauper')).toBe('#123456')
    expect(formatColorClass('Pauper')).toContain('bg-primary')
  })

  it('falls back to the legacy static color when db color is null', () => {
    formats.value = [{ name: 'Draft', color: null }]
    const { formatColor } = useFormatColor()
    expect(formatColor('Draft')).toBe('var(--ui-success)')
  })

  it('falls back to neutral classes for an unknown format', () => {
    formats.value = []
    const { formatColor, formatColorClass } = useFormatColor()
    expect(formatColor('Unknown Format')).toBeUndefined()
    expect(formatColorClass('Unknown Format')).toBe('bg-elevated text-muted')
  })
})
