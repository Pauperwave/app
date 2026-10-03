// app\utils\auditAssociateCell.ts
import { h } from 'vue'
import { AssociateTag } from '#components'

// Shared by useTransactionsTableColumns.ts and useWantedCardsTableColumns.ts's createdBy/updatedBy
// columns: a grouped row, or one with no audit name (e.g. a historical import), renders nothing
export function auditAssociateCell(isGrouped: boolean, name: string) {
  if (isGrouped || !name) return null
  return h(AssociateTag, { name })
}
