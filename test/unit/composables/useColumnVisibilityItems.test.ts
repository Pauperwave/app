// test\unit\composables\useColumnVisibilityItems.test.ts
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useColumnVisibilityItems } from '~/composables/useColumnVisibilityItems'
import type { VisibilityTableRef } from '~/composables/useColumnVisibilityItems'

function makeColumn(id: string, visible: boolean, canHide = true) {
  return { id, getCanHide: () => canHide, getIsVisible: () => visible }
}

describe('useColumnVisibilityItems', () => {
  it('lists only hideable columns as checkbox items', () => {
    const columns = [makeColumn('name', true), makeColumn('id', true, false)]
    const table = ref<VisibilityTableRef | null>({
      tableApi: { getAllColumns: () => columns, getColumn: () => undefined }
    })
    const items = useColumnVisibilityItems(table, ref({}), { name: 'Nome' })

    expect(items.value).toHaveLength(1)
    expect(items.value[0]).toMatchObject({ label: 'Nome', type: 'checkbox', checked: true })
  })

  it('falls back to the column id when no header label is given', () => {
    const columns = [makeColumn('unlabeled', false)]
    const table = ref<VisibilityTableRef | null>({
      tableApi: { getAllColumns: () => columns, getColumn: () => undefined }
    })
    const items = useColumnVisibilityItems(table, ref({}), {})
    expect(items.value[0]).toMatchObject({ label: 'unlabeled', checked: false })
  })

  it('toggling an item calls toggleVisibility on the matching column', () => {
    const toggleVisibility = vi.fn()
    const columns = [makeColumn('name', true)]
    const table = ref<VisibilityTableRef | null>({
      tableApi: { getAllColumns: () => columns, getColumn: () => ({ toggleVisibility }) }
    })
    const items = useColumnVisibilityItems(table, ref({}), { name: 'Nome' })

    items.value[0]!.onUpdateChecked!(false)
    expect(toggleVisibility).toHaveBeenCalledWith(false)
  })

  it('returns an empty array when the table ref is null', () => {
    const table = ref<VisibilityTableRef | null>(null)
    const items = useColumnVisibilityItems(table, ref({}), {})
    expect(items.value).toEqual([])
  })
})
