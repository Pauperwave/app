// app\utils\transactions\transactionIssues.ts
import type { Transaction } from '~/types'

// Broader than hasMissingAssociateError/isUnregisteredParticipant (renewalKindBadge.ts), which
// drive the Tesseramento badge: "Da sistemare" (useTransactionsFilters.ts) also catches the "email
// sconosciuta" marker (transactionNotes.ts) on any payment_type, as a defensive fallback for a
// future data gap of another shape
export function needsAttention(transaction: Transaction): boolean {
  return hasMissingAssociateError(transaction)
    || isUnregisteredParticipant(transaction)
    || parseTransactionNotes(transaction.notes).hasUnknownEmail
}
