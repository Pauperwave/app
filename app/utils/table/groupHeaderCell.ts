// app\utils\table\groupHeaderCell.ts
import { h, type VNodeChild } from 'vue'
import { UBadge, UIcon } from '#components'
import type { Row } from '@tanstack/vue-table'

// The cell of a group-header row in the tournaments, leagues and events tables: the expand
// chevron, what the group is (a text or a badge) and how many rows it holds
export function groupHeaderCell<T>(row: Row<T>, group: string | VNodeChild) {
  return h('button', {
    type: 'button',
    class: 'flex items-center gap-1.5 font-medium cursor-pointer',
    onClick: () => row.toggleExpanded()
  }, [
    h(UIcon, {
      name: row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight,
      class: 'size-4'
    }),
    typeof group === 'string' ? h('span', group) : group,
    h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm' }, () => String(row.subRows.length))
  ])
}
