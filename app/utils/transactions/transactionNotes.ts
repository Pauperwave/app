// app\utils\transactions\transactionNotes.ts
// The 2026 historical import (.scratch/import-transactions.mjs, never
// committed — see the migration/import session) wrote two machine-readable
// markers into `notes` instead of their own columns: "(ricevuta n° X)" and,
// for guest payers with no real email on file, "| email sconosciuta,
// generata per import storico". Parsed here so the table can render them as
// a dedicated badge + icon instead of raw sentence fragments. Returns
// everything as "not present" for any transaction created normally (through
// the app), which never has this pattern in its notes.
export interface ParsedTransactionNotes {
  receiptRef: string | null
  hasUnknownEmail: boolean
  cleanNotes: string
}

const RECEIPT_PATTERN = /Importato da foglio storico ricevute \d{4}(?: \(ricevuta n° ([^)]+)\))?/
const UNKNOWN_EMAIL_MARKER = ' | email sconosciuta, generata per import storico'

export function parseTransactionNotes(notes: string): ParsedTransactionNotes {
  const receiptMatch = notes.match(RECEIPT_PATTERN)
  const receiptRef = receiptMatch?.[1] ?? null
  const hasUnknownEmail = notes.includes(UNKNOWN_EMAIL_MARKER)

  const cleanNotes = notes
    .replace(RECEIPT_PATTERN, '')
    .replace(UNKNOWN_EMAIL_MARKER, '')
    .trim()

  return { receiptRef, hasUnknownEmail, cleanNotes }
}
