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
import { registerMenu, registerBackResolver } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'
import { ICONS } from '../../icons'
import { registerDeepLink } from '../../deepLinks'

// Fetched once per render and filtered by month client-side, keeping the callback handler stateless
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

  // Only the leagues appearing on this page, not every league's history (see queries.ts)
  const leagueUuids = [...new Set(rows.map(row => row.league_uuid).filter(uuid => uuid !== null))]
  const stageNumbers = await fetchStageNumbers(leagueUuids)
  return rows.map(row => ({ ...row, stageNumber: stageNumbers.get(row.uuid) ?? null }))
}

// Empty map for an unlinked chat: personalIcon() then falls back to its "not registered" default
// (like leghe.ts)
async function fetchRegistrations(
  rows: DatedTournamentRow[], chatId: number
): Promise<Map<string, RegistrationStatus>> {
  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) return new Map()
  return fetchRegistrationStatuses(rows.map(row => row.uuid), associateUuid)
}

// The command handler and calendarioMenu's .dynamic() both run these queries in one update:
// memoizing by ctx halves them. See perContextCache.ts
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

// formatTelegramDate, not plain format: the date is a timestamptz and the server runs in UTC, so it
// must read in Italy's timezone
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

// A button under each tournament, as a "buttons" block in the rich message body (not a Menu
// reply_markup), so it sits next to its tournament instead of in one list at the end. Handled by a
// plain bot.on('callback_query:data') (see registerCalendarioCommand), since @grammyjs/menu only
// manages reply_markup.
const CAL_OPEN_PREFIX = 'calopen:'

function encodeCalOpenPayload(uuid: string, origin: string): string {
  return `${CAL_OPEN_PREFIX}${uuid}:${origin}`
}

function decodeCalOpenPayload(data: string): { uuid: string, origin: string } {
  const rest = data.slice(CAL_OPEN_PREFIX.length)
  const separator = rest.indexOf(':')
  return { uuid: rest.slice(0, separator), origin: rest.slice(separator + 1) }
}

// `month` is a "Rome wall-clock" Date (see nowInRome()): convert back to real instants before
// comparing with row.starts_at, or the boundary is off by Italy's UTC offset
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
    { type: 'heading', size: 3, text: `${ICONS.calendar} Tornei — ${monthLabel(month)}` }
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
      if (row.location?.name) blocks.push({ type: 'paragraph', text: `${ICONS.location} ${row.location.name}` })

      blocks.push({
        type: 'buttons',
        buttons: [{ text: `${ICONS.openDetails} Apri dettagli`, callback_data: encodeCalOpenPayload(row.uuid, origin) }]
      })
    }
  }

  return blocks
}

// Exported so detail.ts's "back" button can rebuild this month view (see menuNav.ts)
export async function calendarioBlocksFor(
  ctx: Context, monthOffset: number, chatId: number
): Promise<InputRichMessage['blocks']> {
  const rows = await cachedFetchUpcomingTournaments(ctx)
  const month = addMonths(startOfMonth(nowInRome()), monthOffset)
  const registrations = await cachedFetchRegistrations(ctx, rows, chatId)
  return calendarioBlocks(rows, month, registrations, monthOffset)
}

// Only the month-nav buttons live here; per-tournament buttons are inline rich-message blocks (see
// calendarioBlocks). onMenuOutdated: false: live data is re-fetched every render, so the staleness
// fingerprint legitimately differs.
export const calendarioMenu = new Menu<Context>('cal', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic((ctx, range) => {
  // || not ??: ctx.match is '' (not undefined) for a bare /calendario; same gap as in
  // risultato.ts's decodeResultState
  const monthOffset = Number(ctx.match || '0')

  range
    .text({ text: `${ICONS.previous} Mese prec.`, payload: String(monthOffset - 1) }, monthNav)
    .text({ text: `Mese succ. ${ICONS.following}`, payload: String(monthOffset + 1) }, monthNav)
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

// Handles taps on calendarioBlocks's per-tournament "buttons" blocks; registered before
// bot.use(commands), own callback_data prefix so it only claims its own presses
async function handleCalendarioOpenButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(CAL_OPEN_PREFIX)) return next()

  const { uuid, origin } = decodeCalOpenPayload(data)
  await openTournamentDetail(ctx, uuid, origin)
}

registerMenu('cal', calendarioMenu)

// Rebuilds this month view for detail.ts's "back" button; a registry (see menuNav.ts) to avoid a
// circular import
registerBackResolver('m', async (ctx, origin, chatId) => {
  const offset = Number(origin.slice(1))
  const blocks = await calendarioBlocksFor(ctx, offset, chatId)
  return { payload: String(offset), menu: calendarioMenu, text: { blocks } }
})

// Extracted for reuse by t.me/<bot>?start=calendario (deepLinks.ts)
async function calendarioCommandHandler(ctx: Context) {
  if (!ctx.chat?.id) return

  try {
    const blocks = await calendarioBlocksFor(ctx, 0, ctx.chat.id)
    await ctx.replyWithRichMessage({ blocks }, { reply_markup: calendarioMenu })
  } catch (err) {
    console.error('Failed to handle /calendario:', err)
    await ctx.replyWithRichMessage({
      markdown: `${ICONS.warning} Non sono riuscito a recuperare i tornei, riprova più tardi.`
    })
  }
}

registerDeepLink('calendario', calendarioCommandHandler)

export function registerCalendarioCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time: registerCalendarioCommand only runs once every command module has
  // loaded, so torneoMenu is initialized
  calendarioMenu.register(torneoMenu)
  bot.use(calendarioMenu)

  // Order vs bot.use(commands) doesn't matter: CommandGroup never dispatches callback_query:data
  bot.on('callback_query:data', handleCalendarioOpenButton)

  commands.command('calendario', 'Prossimi tornei', calendarioCommandHandler)
}
