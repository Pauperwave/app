// server\utils\telegram\commands\tournaments\calendario.ts
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { formatButtonDate, stageLabel, tournamentButtonLabel, tournamentLine, personalIcon } from './line'
import { fetchRegistrationStatuses, fetchStageNumbers, OPEN_TOURNAMENT_STATUSES } from './queries'
import type { RegistrationStatus } from './queries'
import { SELECT_COLUMNS, torneoMenu, openTournamentDetail } from './detail'
import type { DatedTournamentRow, TournamentRow } from './detail'
import { answerLoadError, requireChatId } from '../callbackErrors'
import { registerMenu } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'
import { registerDeepLink } from '../../deepLinks'
import { showThinkingDraft } from '../../thinkingDraft'

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

// `month` is a "Rome wall-clock" Date (see nowInRome()) — start/end must
// convert back to real instants before comparing against row.starts_at, or
// the month boundary would be off by Italy's UTC offset again.
function calendarioMessage(
  rows: DatedTournamentRow[], month: Date, registrations: Map<string, RegistrationStatus>
): FormattedString {
  const start = zonedRomeTimeToInstant(startOfMonth(month))
  const end = zonedRomeTimeToInstant(endOfMonth(month))

  const filtered = rows.filter((row) => {
    const date = new Date(row.starts_at)
    return date >= start && date <= end
  })

  const header = fmt`🎲 ${FormattedString.b(`Tornei — ${monthLabel(month)}`)}`

  if (!filtered.length) return fmt`${header}\n\nNessun torneo in programma.`

  const days = groupByDay(filtered).map(({ day, rows: dayRows }) => {
    const dayHeader = FormattedString.b(dayLabel(day))
    const dayLines = dayRows.map(row => tournamentLine({
      status: row.status,
      name: row.name,
      stageSuffix: stageLabel(row.stageNumber),
      locationName: row.location?.name,
      icon: personalIcon(registrations.get(row.uuid) ?? null)
    }))
    return fmt`${dayHeader}\n${FormattedString.join(dayLines, '\n')}`
  })

  return fmt`${header}\n\n${FormattedString.join(days, '\n\n')}\n\n👇🏻 Tocca un torneo per i dettagli`
}

// Exported so tournament/detail.ts's "back" button can rebuild this exact
// month view — see menuNav.ts's comment on this circular import.
export async function calendarioText(
  ctx: Context, monthOffset: number, chatId: number
): Promise<FormattedString> {
  const rows = await cachedFetchUpcomingTournaments(ctx)
  const month = addMonths(startOfMonth(nowInRome()), monthOffset)
  const registrations = await cachedFetchRegistrations(ctx, rows, chatId)
  return calendarioMessage(rows, month, registrations)
}

// autoAnswer: false — "open tournament" buttons delegate to
// openTournamentDetail, which answers the callback itself.
// onMenuOutdated: false — this re-fetches live data every render, so the
// plugin's staleness fingerprint legitimately differs across renders;
// every handler already re-validates itself (e.g. "Torneo non trovato").
export const calendarioMenu = new Menu<Context>('cal', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(async (ctx, range) => {
  // || not ?? — ctx.match is '' (not undefined) for a bare /calendario, and
  // ?? doesn't substitute on '' (harmless here since Number('') === 0, but
  // this exact gap did break a multi-field payload elsewhere — see
  // risultato.ts's own comment on why).
  const monthOffset = Number(ctx.match || '0')
  const chatId = ctx.chat?.id
  if (!chatId) return

  const month = addMonths(startOfMonth(nowInRome()), monthOffset)
  const start = zonedRomeTimeToInstant(startOfMonth(month))
  const end = zonedRomeTimeToInstant(endOfMonth(month))

  const rows = await cachedFetchUpcomingTournaments(ctx)
  const filtered = rows.filter((row) => {
    const date = new Date(row.starts_at)
    return date >= start && date <= end
  })
  const registrations = await cachedFetchRegistrations(ctx, rows, chatId)

  range
    .text({ text: '◀ Mese prec.', payload: String(monthOffset - 1) }, monthNav)
    .text({ text: 'Mese succ. ▶', payload: String(monthOffset + 1) }, monthNav)

  for (const row of filtered) {
    const date = formatButtonDate(row.starts_at)
    const icon = personalIcon(registrations.get(row.uuid) ?? null)
    const label = tournamentButtonLabel(icon, date, row.stageNumber, row.name)
    const origin = `m${monthOffset}`
    // payload: String(monthOffset), not the `${uuid}:${origin}` pair the
    // handler actually needs (it gets those from this closure instead) —
    // this menu's own re-render (for the row/col lookup on press) decodes
    // ctx.match as `Number(ctx.match || '0')` above. A composite payload
    // would parse to NaN there, emptying `filtered` and crashing the
    // plugin's row/col lookup with no visible error. Confirmed 2026-09-06.
    range.row().text(
      { text: label, payload: String(monthOffset) },
      ctx => openTournamentDetail(ctx, row.uuid, origin)
    )
  }
})

async function monthNav(ctx: Context & { match: string }) {
  const chatId = await requireChatId(ctx)
  if (!chatId) return

  try {
    const monthOffset = Number(ctx.match)
    const text = await calendarioText(ctx, monthOffset, chatId)
    await ctx.editMessageText(text.text, { entities: text.entities, reply_markup: calendarioMenu })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

registerMenu('cal', calendarioMenu)

// Extracted so it can be reused verbatim by t.me/<bot>?start=calendario —
// see deepLinks.ts.
async function calendarioCommandHandler(ctx: Context) {
  if (!ctx.chat?.id) return

  showThinkingDraft(ctx)
  try {
    const text = await calendarioText(ctx, 0, ctx.chat.id)
    await ctx.reply(text.text, { entities: text.entities, reply_markup: calendarioMenu })
  } catch {
    await ctx.reply('⚠️ Non sono riuscito a recuperare i tornei, riprova più tardi.')
  }
}

registerDeepLink('calendario', calendarioCommandHandler)

export function registerCalendarioCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time — torneoMenu's own module imports calendarioText
  // back, so accessing torneoMenu at top level would race the circular import.
  calendarioMenu.register(torneoMenu)
  bot.use(calendarioMenu)

  commands.command('calendario', 'Prossimi tornei', calendarioCommandHandler)
}
