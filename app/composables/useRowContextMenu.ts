// app\composables\useRowContextMenu.ts
// UTable's @contextmenu can't tell which row was right-clicked, so it is tracked here and the
// wrapping UContextMenu's :items recompute from it (extracted from four identical copies).
// shallowRef, not ref: the value is only replaced wholesale, and some domain types (e.g. Associate,
// with an optional Nuxt UI AvatarProps field) blow up Vue's UnwrapRef with TS2589 under a plain ref
import type { DropdownMenuItem } from '@nuxt/ui'

export function useRowContextMenu<T>(rowContextMenuItems: (item: T) => DropdownMenuItem[]) {
  const contextMenuRow = shallowRef<T | null>(null)
  function onRowContextmenu(_e: Event, row: { original: T }) {
    contextMenuRow.value = row.original
  }
  const tableContextMenuItems = computed<DropdownMenuItem[]>(() =>
    contextMenuRow.value ? rowContextMenuItems(contextMenuRow.value) : [])

  return { contextMenuRow, onRowContextmenu, tableContextMenuItems }
}
