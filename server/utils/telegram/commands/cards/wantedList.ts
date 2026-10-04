// server\utils\telegram\commands\cards\wantedList.ts
import { InlineKeyboard } from 'grammy'
import { escapeHtml } from './priceCard'
import { ICONS } from '../../icons'

// Pure part of /cercate: the page of wanted cards, the confirm screen and the callbacks that move
// between them

export interface WantedListRow {
  id: number
  card_name: string
  set_code: string | null
  language: string | null
  treatment: string[]
  copies: number
  cardmarket_price: number | null
  image_url: string | null
}

export const WANTED_LIST_PAGE_SIZE = 8
export const WANTED_LIST_CALLBACK_PREFIX = 'cer:'

type WantedListAction = 'list' | 'ask' | 'remove'

export interface WantedListCallback {
  action: WantedListAction
  page: number
  // The wanted card the action is about; null for a plain page change
  id: number | null
}

const ACTION_CODES: Record<WantedListAction, string> = { list: 'l', ask: 'r', remove: 'x' }
const euroFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

// "cer:l:<page>" shows a page, "cer:r:<id>:<page>" asks to remove one, "cer:x:<id>:<page>" does it
export function encodeWantedListCallback(callback: WantedListCallback): string {
  const code = ACTION_CODES[callback.action]
  return callback.action === 'list'
    ? `${WANTED_LIST_CALLBACK_PREFIX}${code}:${callback.page}`
    : `${WANTED_LIST_CALLBACK_PREFIX}${code}:${callback.id}:${callback.page}`
}

// Null for anything malformed: callback_data is client-controlled, never trusted blindly
export function decodeWantedListCallback(data: string): WantedListCallback | null {
  if (!data.startsWith(WANTED_LIST_CALLBACK_PREFIX)) return null

  const parts = data.slice(WANTED_LIST_CALLBACK_PREFIX.length).split(':')
  const code = parts[0]
  const numbers = parts.slice(1)
  if (numbers.some(part => !/^\d{1,12}$/.test(part))) return null

  if (code === ACTION_CODES.list && numbers.length === 1) {
    return { action: 'list', id: null, page: Number(numbers[0]) }
  }
  if (numbers.length !== 2) return null

  const action = (Object.keys(ACTION_CODES) as WantedListAction[])
    .find(candidate => ACTION_CODES[candidate] === code)
  if (!action || action === 'list') return null

  return { action, id: Number(numbers[0]), page: Number(numbers[1]) }
}

function languageLabel(language: string | null): string | null {
  return language ? language.toUpperCase() : null
}

function describeRow(row: WantedListRow, position: number): string {
  const details = [
    row.set_code ? `(${row.set_code.toUpperCase()})` : null,
    row.copies > 1 ? `×${row.copies}` : null,
    languageLabel(row.language),
    row.treatment.includes('foil') ? 'foil' : null,
    row.cardmarket_price !== null ? `CM ${euroFormatter.format(row.cardmarket_price)}` : null
  ].filter(detail => detail !== null)

  return `${position}. <b>${escapeHtml(row.card_name)}</b> ${details.join(' · ')}`.trimEnd()
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / WANTED_LIST_PAGE_SIZE))
}

export function buildWantedListText(rows: WantedListRow[], page: number, total: number): string {
  if (total === 0) {
    return 'Non stai cercando nessuna carta. Cercane una con @bot $ nome carta, o incolla un elenco con /importa.'
  }

  const first = page * WANTED_LIST_PAGE_SIZE
  const pages = pageCount(total)

  return [
    `${ICONS.card} <b>Le mie carte cercate</b> (${total})`,
    rows.map((row, index) => describeRow(row, first + index + 1)).join('\n'),
    pages > 1 ? `Pagina ${page + 1} di ${pages}` : null
  ].filter(part => part !== null).join('\n\n')
}

export function buildWantedListKeyboard(
  rows: WantedListRow[],
  page: number,
  total: number
): InlineKeyboard {
  const keyboard = new InlineKeyboard()
  const first = page * WANTED_LIST_PAGE_SIZE

  rows.forEach((row, index) => {
    keyboard.text(
      `${ICONS.trash} ${first + index + 1}`,
      encodeWantedListCallback({ action: 'ask', id: row.id, page })
    )
    if ((index + 1) % 4 === 0) keyboard.row()
  })

  const pages = pageCount(total)
  if (pages > 1) {
    keyboard.row()
    if (page > 0) keyboard.text(ICONS.previous, encodeWantedListCallback({ action: 'list', id: null, page: page - 1 }))
    if (page < pages - 1) keyboard.text(ICONS.following, encodeWantedListCallback({ action: 'list', id: null, page: page + 1 }))
  }

  return keyboard
}

export function buildRemoveConfirmText(row: WantedListRow): string {
  const set = row.set_code ? ` (${row.set_code.toUpperCase()})` : ''
  return `Togliere <b>${escapeHtml(row.card_name)}</b>${set} dalle tue carte cercate?`
}

export function buildRemoveConfirmKeyboard(row: WantedListRow, page: number): InlineKeyboard {
  return new InlineKeyboard()
    .text(`${ICONS.trash} Sì, togli`, encodeWantedListCallback({ action: 'remove', id: row.id, page }))
    .text(`${ICONS.back} No`, encodeWantedListCallback({ action: 'list', id: null, page }))
}
