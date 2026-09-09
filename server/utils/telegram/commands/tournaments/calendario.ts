// server\utils\telegram\commands\tournaments\calendario.ts
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'

import { stageLabel, personalIcon } from './line'
import { fetchRegistrationStatuses, fetchStageNumbers, OPEN_TOURNAMENT_STATUSES } from './queries'
import type { RegistrationStatus } from './queries'
import { SELECT_COLUMNS, torneoMenu, openTournamentDetail } from './detail'
import type { DatedTournamentRow, TournamentRow } from './detail'
import { answerLoadError, requireChatId } from '../callbackErrors'
import { registerMenu } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'
import { registerDeepLink } from '../../deepLinks'

// Fetched once per render, filtered by month client-side — keeps the
// callback handler stateless (no need to remember what a user was viewing).
const MAX_ROWS = 200

async function fetchUpcomingTournaments(): Promise<DatedTournamentRow[]> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select(SELECT_COLUMNS)
    .is('deleted_at', null)
    .in('status', OPEN_TOURNAMENT_STATUSES)
    .gte('starts_at', zonedRomeTimeToInstant(startOfMonth(nowInRome())).toISOString())
    .order('starts_at', { ascending: true })
    .limit(MAX_ROWS)

  if (error) throw error
  const rows = (data as TournamentRow[])
    .filter((row): row is TournamentRow & { starts_at: string } => row.starts_at !== null)

  // Scoped to only the leagues actually appearing on this page, instead of
  // every league's full history — see queries.ts's own comment on why.
  const leagueUuids = [...new Set(rows.map(row => row.league_uuid).filter(uuid => uuid !== null))]
  const stageNumbers = await fetchStageNumbers(leagueUuids)
  return rows.map(row => ({ ...row, stageNumber: stageNumbers.get(row.uuid) ?? null }))
}

// Empty map for an unlinked chat — every personalIcon() lookup then falls
// back to its own "not registered" default, same as leghe.ts's own pattern.
async function fetchRegistrations(
  rows: DatedTournamentRow[], chatId: number
): Promise<Map<string, RegistrationStatus>> {
  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) return new Map()
  return fetchRegistrationStatuses(rows.map(row => row.uuid), associateUuid)
}

// The initial command handler and calendarioMenu's own .dynamic() re-render
// both run these two queries within the same update — memoizing by ctx
// halves the query count on every /calendario open. See perContextCache.ts.
const memoize = createPerContextCache<{
  rows: Promise<DatedTournamentRow[]>
  registrations: Promise<Map<string, RegistrationStatus>>
}>()

function cachedFetchUpcomingTournaments(ctx: Context): Promise<DatedTournamentRow[]> {
  return memoize(ctx, 'rows', () => fetchUpcomingTournaments())
}

function cachedFetchRegistrations(
  ctx: Context, rows: DatedTournamentRow[], chatId: number
): Promise<Map<string, RegistrationStatus>> {
  return memoize(ctx, 'registrations', () => fetchRegistrations(rows, chatId))
}

function monthLabel(month: Date): string {
  return format(month, 'MMMM yyyy', { locale: it })
}

// formatTelegramDate (not plain format) — date comes from a timestamptz
// and this runs on a UTC server, so it must read out in Italy's timezone.
function dayLabel(date: Date): string {
  const label = formatTelegramDate(date, 'EEEE d MMMM', { locale: it })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

interface DayGroup {
  day: Date
  rows: DatedTournamentRow[]
}

function groupByDay(rows: DatedTournamentRow[]): DayGroup[] {
  const groups = new Map<string, DayGroup>()
  for (const row of rows) {
    const key = formatTelegramDate(row.starts_at, 'yyyy-MM-dd')
    const group = groups.get(key)
    if (group) group.rows.push(row)
    else groups.set(key, { day: new Date(row.starts_at), rows: [row] })
  }
  return [...groups.values()].sort((a, b) => a.day.getTime() - b.day.getTime())
}

// A button right under each tournament, embedded as its own "buttons"
// block in the rich message body — not a Menu-managed reply_markup — so
// it sits next to the tournament it opens instead of in one long list at
// the very end of the message. User request 2026-09-09 ("avere tutti
// quei bottoni in fondo non è il massimo a livello di UX"). Handled by a
// plain bot.on('callback_query:data', ...) below (see registerCalendarioCommand)
// rather than @grammyjs/menu, which only manages reply_markup buttons.
const CAL_OPEN_PREFIX = 'calopen:'

function encodeCalOpenPayload(uuid: string, origin: string): string {
  return `${CAL_OPEN_PREFIX}${uuid}:${origin}`
}

function decodeCalOpenPayload(data: string): { uuid: string, origin: string } {
  const rest = data.slice(CAL_OPEN_PREFIX.length)
  const separator = rest.indexOf(':')
  return { uuid: rest.slice(0, separator), origin: rest.slice(separator + 1) }
}

// `month` is a "Rome wall-clock" Date (see nowInRome()) — start/end must
// convert back to real instants before comparing against row.starts_at, or
// the month boundary would be off by Italy's UTC offset again.
function calendarioBlocks(
  rows: DatedTournamentRow[], month: Date,
  registrations: Map<string, RegistrationStatus>, monthOffset: number
): InputRichMessage['blocks'] {
  const start = zonedRomeTimeToInstant(startOfMonth(month))
  const end = zonedRomeTimeToInstant(endOfMonth(month))

  const filtered = rows.filter((row) => {
    const date = new Date(row.starts_at)
    return date >= start && date <= end
  })

  const blocks: InputRichMessage['blocks'] = [
    { type: 'heading', size: 3, text: `🎲 Tornei — ${monthLabel(month)}` }
  ]

  if (!filtered.length) {
    blocks.push({ type: 'paragraph', text: 'Nessun torneo in programma.' })
    return blocks
  }

  const origin = `m${monthOffset}`
  for (const { day, rows: dayRows } of groupByDay(filtered)) {
    blocks.push({ type: 'paragraph', text: { type: 'bold', text: dayLabel(day) } })

    for (const row of dayRows) {
      const icon = personalIcon(registrations.get(row.uuid) ?? null)
      const stage = stageLabel(row.stageNumber)
      blocks.push({ type: 'paragraph', text: `${icon} ${row.name}${stage}` })
      if (row.location?.name) blocks.push({ type: 'paragraph', text: `📍 ${row.location.name}` })

      blocks.push({
        type: 'buttons',
        buttons: [{ text: '👇🏻 Apri dettagli', callback_data: encodeCalOpenPayload(row.uuid, origin) }]
      })
    }
  }

  return blocks
}

// Exported so tournament/detail.ts's "back" button can rebuild this exact
// month view — see menuNav.ts's comment on this circular import.
export async function calendarioBlocksFor(
  ctx: Context, monthOffset: number, chatId: number
): Promise<InputRichMessage['blocks']> {
  const rows = await cachedFetchUpcomingTournaments(ctx)
  const month = addMonths(startOfMonth(nowInRome()), monthOffset)
  const registrations = await cachedFetchRegistrations(ctx, rows, chatId)
  return calendarioBlocks(rows, month, registrations, monthOffset)
}

// Only the month-nav buttons live here now — per-tournament "open detail"
// buttons are inline rich-message "buttons" blocks (see calendarioBlocks),
// not Menu-managed reply_markup, so they sit right under their own
// tournament instead of in one long list at the end of the message.
// onMenuOutdated: false — this re-fetches live data every render, so the
// plugin's staleness fingerprint legitimately differs across renders.
export const calendarioMenu = new Menu<Context>('cal', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic((ctx, range) => {
  // || not ?? — ctx.match is '' (not undefined) for a bare /calendario, and
  // ?? doesn't substitute on '' (harmless here since Number('') === 0, but
  // this exact gap did break a multi-field payload elsewhere — see
  // risultato.ts's own comment on why).
  const monthOffset = Number(ctx.match || '0')

  range
    .text({ text: '◀ Mese prec.', payload: String(monthOffset - 1) }, monthNav)
    .text({ text: 'Mese succ. ▶', payload: String(monthOffset + 1) }, monthNav)
})

async function monthNav(ctx: Context & { match: string }) {
  const chatId = await requireChatId(ctx)
  if (!chatId) return

  try {
    const monthOffset = Number(ctx.match)
    const blocks = await calendarioBlocksFor(ctx, monthOffset, chatId)
    await ctx.editMessageText({ blocks }, { reply_markup: calendarioMenu })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

// Handles taps on calendarioBlocks's own per-tournament "buttons" blocks —
// registered before bot.use(commands) (see registerCalendarioCommand),
// distinct callback_data prefix so it only ever claims its own presses.
async function handleCalendarioOpenButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(CAL_OPEN_PREFIX)) return next()

  const { uuid, origin } = decodeCalOpenPayload(data)
  await openTournamentDetail(ctx, uuid, origin)
}

registerMenu('cal', calendarioMenu)

// Extracted so it can be reused verbatim by t.me/<bot>?start=calendario —
// see deepLinks.ts.
async function calendarioCommandHandler(ctx: Context) {
  if (!ctx.chat?.id) return

  try {
    const blocks = await calendarioBlocksFor(ctx, 0, ctx.chat.id)
    await ctx.replyWithRichMessage({ blocks }, { reply_markup: calendarioMenu })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: '⚠️ Non sono riuscito a recuperare i tornei, riprova più tardi.'
    })
  }
}

registerDeepLink('calendario', calendarioCommandHandler)

export function registerCalendarioCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time — torneoMenu's own module imports calendarioText
  // back, so accessing torneoMenu at top level would race the circular import.
  calendarioMenu.register(torneoMenu)
  bot.use(calendarioMenu)

  // Registered before bot.use(commands) in commands/index.ts's ordering
  // doesn't matter here — callback_query:data isn't dispatched by
  // CommandGroup at all, so there's no load-bearing order versus it.
  bot.on('callback_query:data', handleCalendarioOpenButton)

  commands.command('calendario', 'Prossimi tornei', calendarioCommandHandler)
}
