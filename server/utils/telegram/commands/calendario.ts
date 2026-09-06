// server\utils\telegram\commands\calendario.ts
import { Menu } from '@grammyjs/menu'
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import { formatButtonDate, stageLabel, statusIcon, tournamentButtonLabel, tournamentLine } from './tournament/line'
import { fetchShowExternalTournaments, fetchStageNumbers } from './tournament/queries'
import { SELECT_COLUMNS, torneoMenu, openTournamentDetail } from './tournament/detail'
import { answerLoadError } from './callbackErrors'
import { registerMenu } from '../menuNav'
import { FormattedString } from '@grammyjs/parse-mode'
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import type { DatedTournamentRow, TournamentRow } from './tournament/detail'

// 'external' (2026-09-04): shop-organized tournaments (Magman etc.) show up
// here too for schedule comparison — see isExternalOrganizer in
// tournament/detail.ts. Deliberately not added to prossimo.ts's own
// OPEN_STATUSES (user request) — "your next tournament" stays Pauperwave-only.
// Hidden by default per chat (pauperwave_telegram_chat_settings,
// fetchShowExternalTournaments) — toggled on via /visibilita.
const BASE_OPEN_STATUSES = ['registration_open', 'in_progress']
// Fetched once per render, filtered by month client-side — cheap enough for
// a league of this size, and keeps the callback handler stateless (no need
// to remember what a user was looking at between messages).
const MAX_ROWS = 200

async function fetchUpcomingTournaments(chatId: number): Promise<DatedTournamentRow[]> {
  const supabase = publicSupabaseClient()

  const showExternal = await fetchShowExternalTournaments(chatId)
  const openStatuses = showExternal ? [...BASE_OPEN_STATUSES, 'external'] : BASE_OPEN_STATUSES

  const [{ data, error }, stageNumbers] = await Promise.all([
    supabase
      .from('tournaments')
      .select(SELECT_COLUMNS)
      .is('deleted_at', null)
      .in('status', openStatuses)
      .gte('starts_at', zonedRomeTimeToInstant(startOfMonth(nowInRome())).toISOString())
      .order('starts_at', { ascending: true })
      .limit(MAX_ROWS),
    fetchStageNumbers()
  ])

  if (error) throw error
  return (data as TournamentRow[])
    .filter((row): row is TournamentRow & { starts_at: string } => row.starts_at !== null)
    .map(row => ({ ...row, stageNumber: stageNumbers.get(row.uuid) ?? null }))
}

function monthLabel(month: Date): string {
  return format(month, 'MMMM yyyy', { locale: it })
}

// formatTelegramDate (not plain format) — date is built from a stored
// timestamptz (row.starts_at, see groupByDay below), and this runs on a
// UTC server, so the day/weekday must be read out in Italy's own timezone,
// not the runtime's.
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

// `month` is a "Rome wall-clock" Date (see nowInRome()'s own comment) —
// safe to format directly (monthLabel below) or run through startOfMonth/
// endOfMonth, but start/end must be converted back to real instants before
// comparing against row.starts_at (an actual timestamptz), or the whole
// month boundary would be off by Italy's UTC offset again.
function calendarioMessage(rows: DatedTournamentRow[], month: Date): FormattedString {
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
      locationName: row.location?.name
    }))
    return fmt`${dayHeader}\n${FormattedString.join(dayLines, '\n')}`
  })

  return fmt`${header}\n\n${FormattedString.join(days, '\n\n')}\n\n👇 Tocca un torneo per i dettagli`
}

// Exported so tournament/detail.ts's shared "back" button can rebuild this
// exact month view when returning from a detail page opened from here — see
// menuNav.ts's own comment on why this is a (safe, deferred-access)
// circular import.
export async function calendarioText(
  monthOffset: number, chatId: number
): Promise<FormattedString> {
  const rows = await fetchUpcomingTournaments(chatId)
  const month = addMonths(startOfMonth(nowInRome()), monthOffset)
  return calendarioMessage(rows, month)
}

// autoAnswer: false — the "open tournament" buttons delegate to
// openTournamentDetail, which answers the callback itself (with a custom
// alert on "not found"); autoAnswer's default fork would race with that.
export const calendarioMenu = new Menu<Context>('cal', { autoAnswer: false }).dynamic(async (ctx, range) => {
  const monthOffset = Number(ctx.match ?? '0')
  const chatId = ctx.chat?.id
  if (!chatId) return

  const month = addMonths(startOfMonth(nowInRome()), monthOffset)
  const start = zonedRomeTimeToInstant(startOfMonth(month))
  const end = zonedRomeTimeToInstant(endOfMonth(month))

  const rows = await fetchUpcomingTournaments(chatId)
  const filtered = rows.filter((row) => {
    const date = new Date(row.starts_at)
    return date >= start && date <= end
  })

  range
    .text({ text: '◀ Mese prec.', payload: String(monthOffset - 1) }, monthNav)
    .text({ text: 'Mese succ. ▶', payload: String(monthOffset + 1) }, monthNav)

  for (const row of filtered) {
    const date = formatButtonDate(row.starts_at)
    const label = tournamentButtonLabel(statusIcon(row.status), date, row.stageNumber, row.name)
    const origin = `m${monthOffset}`
    range.row().text(
      { text: label, payload: `${row.uuid}:${origin}` },
      ctx => openTournamentDetail(ctx, row.uuid, origin)
    )
  }
})

async function monthNav(ctx: Context & { match: string }) {
  const chatId = ctx.chat?.id
  if (!chatId) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  try {
    const monthOffset = Number(ctx.match)
    const text = await calendarioText(monthOffset, chatId)
    await ctx.editMessageText(text.text, { entities: text.entities, reply_markup: calendarioMenu })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

registerMenu('cal', calendarioMenu)

export function registerCalendarioCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time (not module top level) — torneoMenu's own module
  // imports calendarioText from this file, so accessing torneoMenu itself at
  // this file's top level would race the circular import's evaluation order.
  calendarioMenu.register(torneoMenu)
  bot.use(calendarioMenu)

  commands.command('calendario', 'Prossimi tornei', async (ctx) => {
    try {
      const text = await calendarioText(0, ctx.chat.id)
      await ctx.reply(text.text, { entities: text.entities, reply_markup: calendarioMenu })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare i tornei, riprova più tardi.')
    }
  })
}
