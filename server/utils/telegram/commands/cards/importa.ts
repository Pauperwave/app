// server\utils\telegram\commands\cards\importa.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

import { looksLikeDecklist, parseDecklist, type DecklistEntry } from '#shared/utils/wantedCards/decklist'
import { lookupDecklistEntry } from '#shared/utils/wantedCards/decklistLookup'
import {
  buildWantedCardRow,
  isAlreadyWanted,
  wantedChoiceFor,
  wantedTreatmentOf,
  type WantedCardInsert
} from '#shared/utils/wantedCards/wantedCardRow'

import { NOT_LINKED_MESSAGE, resolveAssociateUuidByChatId } from '../account/linking'
import { registerDeepLink } from '../../deepLinks'
import { buildImportSummary, type ImportOutcome } from './importSummary'
import { scryfallLookupGetter } from './scryfall'
import { ICONS } from '../../icons'

// Importing a pasted card list into the wanted cards. Stateless like the support flow: the command
// answers with a ForceReply prompt and the next message, a reply to exactly that prompt, is the
// list. A message that is unmistakably a list (every line "qty name (SET) number") is imported
// without the prompt.

const IMPORT_PROMPT = 'Incolla l\'elenco delle carte da cercare, una per riga (es. 1 Erode (SOS) 15): rispondi a questo messaggio.'
const NO_CARDS_TEXT = `${ICONS.thinking} Non ho riconosciuto nessuna carta. Scrivi una carta per riga, es. 1 Erode (SOS) 15.`
const PRIVATE_ONLY_TEXT = 'Scrivimi in privato per importare il tuo elenco.'

// Each line is a Scryfall request and a webhook has a time budget: a long list is cut
const MAX_IMPORT_LINES = 60
// Scryfall asks for 50-100ms between requests
const SCRYFALL_DELAY_MS = 100

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function unreadEntry(line: number, raw: string): DecklistEntry {
  return { line, raw, quantity: 1, name: raw, setCode: null, collectorNumber: null, foil: false }
}

interface ExistingWanted {
  scryfall_id: string | null
  language: string | null
  treatment: string[]
}

async function runImport(ctx: Context, text: string) {
  const chatId = ctx.chat?.id
  if (!chatId || ctx.chat?.type !== 'private') {
    await ctx.reply(PRIVATE_ONLY_TEXT)
    return
  }

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) {
    await ctx.reply(NOT_LINKED_MESSAGE)
    return
  }

  const parsed = parseDecklist(text)
  if (!parsed.entries.length) {
    await ctx.reply(NO_CARDS_TEXT)
    return
  }

  const entries = parsed.entries.slice(0, MAX_IMPORT_LINES)
  const skipped = parsed.entries.length - entries.length
  const pending = await ctx.reply(`${ICONS.pending} Cerco ${entries.length} carte…`)

  const supabase = telegramServiceSupabaseClient()
  const { data: existingRows, error: existingError } = await supabase
    .from('pauperwave_wanted_cards')
    .select('scryfall_id, language, treatment')
    .eq('player_associate_uuid', associateUuid)
    .eq('status', 'searching')
    .is('deleted_at', null)
  if (existingError) throw existingError

  // What is already wanted by printing, also fed by the cards added during this import, so a card
  // pasted twice isn't saved twice
  const wantedByCard = new Map<string, ExistingWanted[]>()
  for (const row of existingRows ?? []) {
    if (!row.scryfall_id) continue
    wantedByCard.set(row.scryfall_id, [...(wantedByCard.get(row.scryfall_id) ?? []), row])
  }

  const outcomes: ImportOutcome[] = parsed.invalid.map(({ line, raw }) => ({
    entry: unreadEntry(line, raw), status: 'notFound', cardName: null, setCode: null
  }))
  const rows: WantedCardInsert[] = []
  const addedOutcomes: ImportOutcome[] = []

  for (const entry of entries) {
    try {
      const card = await lookupDecklistEntry(entry, scryfallLookupGetter)
      if (!card) {
        outcomes.push({ entry, status: 'notFound', cardName: null, setCode: null })
        continue
      }

      const choice = wantedChoiceFor(card, {
        language: null, foil: entry.foil, copies: entry.quantity
      })
      const known = wantedByCard.get(card.id) ?? []
      const outcome: ImportOutcome = {
        entry, status: 'added', cardName: card.name, setCode: card.set
      }

      if (isAlreadyWanted(known, choice)) {
        outcome.status = 'already'
      } else {
        rows.push(buildWantedCardRow(card, associateUuid, choice, new Date()))
        wantedByCard.set(card.id, [
          ...known,
          { scryfall_id: card.id, language: null, treatment: wantedTreatmentOf(choice.foil) }
        ])
        addedOutcomes.push(outcome)
      }
      outcomes.push(outcome)
    } catch (err) {
      console.error('Card list import: lookup failed:', err)
      outcomes.push({ entry, status: 'error', cardName: null, setCode: null })
    }

    await sleep(SCRYFALL_DELAY_MS)
  }

  if (rows.length) {
    const { error } = await supabase.from('pauperwave_wanted_cards').insert(rows)
    if (error) {
      console.error('Card list import: insert failed:', error)
      for (const outcome of addedOutcomes) outcome.status = 'error'
    }
  }

  await ctx.api.editMessageText(chatId, pending.message_id, buildImportSummary(outcomes, skipped), {
    parse_mode: 'HTML'
  })
}

function promptForList(ctx: Context) {
  return ctx.reply(IMPORT_PROMPT, {
    reply_markup: { force_reply: true, input_field_placeholder: '1 Erode (SOS) 15' }
  })
}

// Reached from /help's button and ?start=importa, where ctx.match isn't a pasted list
registerDeepLink('importa', promptForList)

async function importaCommandHandler(ctx: Context) {
  const text = (ctx.match as string | undefined)?.trim()
  if (!text) {
    await promptForList(ctx)
    return
  }

  await runImport(ctx, text)
}

export function registerImportaHandlers(bot: Bot, commands: CommandGroup<Context>) {
  // Registered before bot.use(commands) and before the linking catch-all: it only acts on a reply
  // to its own prompt or on an unmistakable card list, and calls next() otherwise
  bot.on('message:text', async (ctx, next) => {
    const text = ctx.message.text
    if (text.startsWith('/')) return next()

    const repliesToPrompt = ctx.message.reply_to_message?.text === IMPORT_PROMPT
    if (!repliesToPrompt && !looksLikeDecklist(text)) return next()

    try {
      await runImport(ctx, text)
    } catch (err) {
      console.error('Card list import failed:', err)
      await ctx.reply(`${ICONS.warning} Non riesco a importare l'elenco adesso. Riprova tra poco.`)
    }
  })

  commands.command(
    'importa',
    'Importa un elenco di carte da cercare — incollalo dopo il comando',
    async (ctx) => {
      try {
        await importaCommandHandler(ctx)
      } catch (err) {
        console.error('/importa failed:', err)
        await ctx.reply(`${ICONS.warning} Non riesco a importare l'elenco adesso. Riprova tra poco.`)
      }
    }
  )
}
