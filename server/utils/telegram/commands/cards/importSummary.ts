// server\utils\telegram\commands\cards\importSummary.ts
import type { DecklistEntry } from '#shared/utils/wantedCards/decklist'
import { escapeHtml } from './priceCard'

// Pure part of the card list import: what happened to each pasted line and the message that says it

export type ImportStatus = 'added' | 'already' | 'notFound' | 'error'

export interface ImportOutcome {
  entry: DecklistEntry
  status: ImportStatus
  // The card Scryfall resolved the line to, when it did
  cardName: string | null
  setCode: string | null
}

// Telegram refuses a message over 4096 characters; the lists are cut well before that
const MAX_LIST_CHARS = 3200

function describe(outcome: ImportOutcome): string {
  const name = outcome.cardName ?? outcome.entry.name
  const set = outcome.setCode ? ` (${outcome.setCode.toUpperCase()})` : ''
  const copies = outcome.entry.quantity > 1 ? ` ×${outcome.entry.quantity}` : ''
  const foil = outcome.entry.foil ? ' · foil' : ''
  return `${escapeHtml(name)}${set}${copies}${foil}`
}

function section(
  title: string,
  outcomes: ImportOutcome[],
  describeLine: (outcome: ImportOutcome) => string
) {
  if (!outcomes.length) return null

  const lines: string[] = []
  let length = 0
  for (const outcome of outcomes) {
    const line = describeLine(outcome)
    if (length + line.length > MAX_LIST_CHARS) {
      lines.push(`…e altre ${outcomes.length - lines.length}`)
      break
    }
    lines.push(line)
    length += line.length + 1
  }

  const body = lines.join('\n')
  return title ? `${title}\n${body}` : body
}

export function buildImportSummary(outcomes: ImportOutcome[], skippedLines: number): string {
  const withStatus = (status: ImportStatus) => outcomes.filter(outcome => outcome.status === status)
  const added = withStatus('added')
  const already = withStatus('already')
  const notFound = withStatus('notFound')
  const failed = withStatus('error')

  const parts = [
    added.length
      ? `✅ <b>Aggiunte ${added.length}</b> alle tue cercate`
      : '🤷 <b>Nessuna carta aggiunta</b>',
    section('', added, describe),
    section('ℹ️ <b>Già nel tuo elenco</b>', already, describe),
    section('❌ <b>Non trovate</b>', notFound, outcome => escapeHtml(outcome.entry.raw)),
    section('⚠️ <b>Errore, riprova</b>', failed, describe),
    skippedLines > 0
      ? `Ho letto solo le prime righe: ne ho ignorate ${skippedLines} oltre il limite.`
      : null
  ]

  return parts.filter(part => part !== null && part !== '').join('\n\n')
}
