// app\utils\transactions\transactionIssues.ts
import type { Transaction } from '~/types'

// Broader than hasMissingAssociateError/isUnregisteredParticipant
// (renewalKindBadge.ts) — those two drive the Tesseramento badge itself.
// "Da sistemare" (useTransactionsFilters.ts) also independently catches the
// "email sconosciuta" marker (transactionNotes.ts) on any payment_type, as a
// defensive fallback for a future data gap that isn't one of the two known
// shapes above (user request, 2026-08-27).
export function needsAttention(transaction: Transaction): boolean {
  return hasMissingAssociateError(transaction)
    || isUnregisteredParticipant(transaction)
    || parseTransactionNotes(transaction.notes).hasUnknownEmail
}
