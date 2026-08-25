// app\utils\transactions\transactionNotes.ts
// The 2026 historical import (.scratch/import-transactions.mjs, never
// committed — see the migration/import session) wrote a machine-readable
// marker into `notes` for guest payers with no real email on file: "email
// sconosciuta, generata per import storico". Parsed here so the table can
// render it as an icon + tooltip instead of a raw sentence fragment.
// Returns `hasUnknownEmail: false` for any transaction created normally
// (through the app), which never has this marker in its notes. The receipt
// number used to live in this same field too (`(ricevuta n° X)`) until
// migration 20260825230000 gave it a real `receipt_ref` column — read that
// directly instead of parsing it out of notes.
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
