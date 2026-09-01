// test\unit\composables\useSelectedTableRows.test.ts
import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useSelectedTableRows } from '~/composables/useSelectedTableRows'
import { useSelection } from '~/composables/useSelection'

interface Item { id: number, name: string }

function makeTable(items: Item[]) {
  return ref({
    tableApi: {
      getFilteredRowModel: () => ({ rows: items.map(item => ({ original: item })) })
    }
  }) as never
}

describe('useSelectedTableRows', () => {
  it('resolves selected ids against the filtered row model', () => {
    const items: Item[] = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Carol' }]
    const table = makeTable(items)
    const selection = useSelection<number>()
    selection.toggle(1)
    selection.toggle(3)

    const selectedRows = useSelectedTableRows(table, selection)
    expect(selectedRows.value).toEqual([items[0], items[2]])
  })

  it('excludes a selected id that is filtered out of the table', () => {
    const items: Item[] = [{ id: 1, name: 'Alice' }]
    const table = makeTable(items)
    const selection = useSelection<number>()
    selection.toggle(1)
    selection.toggle(2) // not in the filtered row model

    const selectedRows = useSelectedTableRows(table, selection)
    expect(selectedRows.value).toEqual([items[0]])
  })

  it('returns an empty array when the table ref is null', () => {
    const table = ref(null) as never
    const selection = useSelection<number>()
    const selectedRows = useSelectedTableRows(table, selection)
    expect(selectedRows.value).toEqual([])
  })
})
