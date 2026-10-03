// app\utils\transactions\transactionNotes.ts
// The 2026 historical import wrote a machine-readable marker into `notes` for guest payers with no
// real email: "email sconosciuta, generata per import storico". Parsed here so the table can show
// an icon + tooltip. `hasUnknownEmail` is false for any transaction created through the app. The
// receipt number lives in the `receipt_ref` column (migration 20260825230000), not in notes.
export interface ParsedTransactionNotes {
  hasUnknownEmail: boolean
  cleanNotes: string
}

const UNKNOWN_EMAIL_MARKER = 'email sconosciuta, generata per import storico'

export function parseTransactionNotes(notes: string): ParsedTransactionNotes {
  const hasUnknownEmail = notes.includes(UNKNOWN_EMAIL_MARKER)
  const cleanNotes = notes.replace(UNKNOWN_EMAIL_MARKER, '').trim()

  return { hasUnknownEmail, cleanNotes }
}
