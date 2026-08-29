// app\utils\auditAssociateCell.ts
import { h } from 'vue'
import { AssociateTag } from '#components'

// Shared by useTransactionsTableColumns.ts and useWantedCardsTableColumns.ts's
// own createdBy/updatedBy columns — a grouped row or a row with no audit name
// (e.g. a historical import with no recorded actor) renders nothing.
export function auditAssociateCell(isGrouped: boolean, name: string) {
  if (isGrouped || !name) return null
  return h(AssociateTag, { name })
}
