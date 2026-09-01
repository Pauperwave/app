// test\unit\composables\useRowContextMenu.test.ts
import { describe, expect, it } from 'vitest'
import { useRowContextMenu } from '~/composables/useRowContextMenu'

interface Item { id: number }

describe('useRowContextMenu', () => {
  it('has no items before any row was right-clicked', () => {
    const { tableContextMenuItems } = useRowContextMenu<Item>(() => [{ label: 'Edit' }])
    expect(tableContextMenuItems.value).toEqual([])
  })

  it('tracks the right-clicked row and builds items from it', () => {
    const { contextMenuRow, onRowContextmenu, tableContextMenuItems }
      = useRowContextMenu<Item>(item => [{ label: `Edit #${item.id}` }])

    onRowContextmenu(new Event('contextmenu'), { original: { id: 42 } })

    expect(contextMenuRow.value).toEqual({ id: 42 })
    expect(tableContextMenuItems.value).toEqual([{ label: 'Edit #42' }])
  })
})
