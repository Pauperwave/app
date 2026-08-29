// app\composables\useRowContextMenu.ts
// UTable's own @contextmenu has no way of knowing which row was right-clicked
// on its own, so it's tracked here and the wrapping UContextMenu's :items
// recompute from it. Repeated byte-identically across
// useCopyLinkContextMenu.ts, useAssociatesRowActions.ts,
// useWantedCardsRowActions.ts and useTransactionsRowActions.ts
// (fallow:dupes, 2026-08-29) before being extracted here. shallowRef, not
// ref: this value is only ever replaced wholesale, never mutated through a
// nested property, and some domain types (e.g. Associate, which carries an
// optional Nuxt UI AvatarProps field) blow up Vue's UnwrapRef with
// "Type instantiation is excessively deep" (TS2589) under a plain ref.
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
