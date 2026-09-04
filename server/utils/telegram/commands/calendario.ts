// server\utils\telegram\commands\calendario.ts
import { InlineKeyboard } from 'grammy'
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import { formatButtonDate, stageLabel, statusIcon, tournamentButtonLabel, tournamentLine } from './tournament/line'
import { fetchStageNumbers } from './tournament/queries'
import { SELECT_COLUMNS, registerTournamentDetailHandlers } from './tournament/detail'
import { answerLoadError, editOrResendMessage } from './callbackErrors'
import type { Bot } from 'grammy'
import type { DatedTournamentRow, TournamentRow } from './tournament/detail'

// 'external' (2026-09-04): shop-organized tournaments (Magman etc.) show up
// here too for schedule comparison — see isExternalOrganizer in
// tournament/detail.ts. Deliberately not added to prossimo.ts's own
// OPEN_STATUSES (user request) — "your next tournament" stays Pauperwave-only.
const OPEN_STATUSES = ['registration_open', 'in_progress', 'external']
// Fetched once per render, filtered by month client-side — cheap enough for
// a league of this size, and keeps the callback handler stateless (no need
// to remember what a user was looking at between messages).
const MAX_ROWS = 200

async function fetchUpcomingTournaments(): Promise<DatedTournamentRow[]> {
  const supabase = publicSupabaseClient()

  const [{ data, error }, stageNumbers] = await Promise.all([
    supabase
      .from('tournaments')
      .select(SELECT_COLUMNS)
      .is('deleted_at', null)
      .in('status', OPEN_STATUSES)
      .gte('starts_at', startOfMonth(new Date()).toISOString())
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

function dayLabel(date: Date): string {
  const label = format(date, 'EEEE d MMMM', { locale: it })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

interface DayGroup {
  day: Date
  rows: DatedTournamentRow[]
}

function groupByDay(rows: DatedTournamentRow[]): DayGroup[] {
  const groups = new Map<string, DayGroup>()
  for (const row of rows) {
    const key = format(new Date(row.starts_at), 'yyyy-MM-dd')
    const group = groups.get(key)
    if (group) group.rows.push(row)
    else groups.set(key, { day: new Date(row.starts_at), rows: [row] })
  }
  return [...groups.values()].sort((a, b) => a.day.getTime() - b.day.getTime())
}

function calendarioMessage(rows: DatedTournamentRow[], month: Date): string {
  const start = startOfMonth(month)
  const end = endOfMonth(month)

  const filtered = rows.filter((row) => {
    const date = new Date(row.starts_at)
    return date >= start && date <= end
  })

  const header = `🎲 *Tornei — ${monthLabel(month)}*`

  if (!filtered.length) return `${header}\n\nNessun torneo in programma.`

  const days = groupByDay(filtered).map(({ day, rows: dayRows }) => {
    const dayHeader = `*${dayLabel(day)}*`
    const dayLines = dayRows.map(row => tournamentLine({
      status: row.status,
      name: row.name,
      stageSuffix: stageLabel(row.stageNumber),
      locationName: row.location?.name
    }))
    return `${dayHeader}\n${dayLines.join('\n')}`
  })

  return `${header}\n\n${days.join('\n\n')}\n\n👇 Tocca un torneo per i dettagli`
}

function buildKeyboard(rows: DatedTournamentRow[], monthOffset: number): InlineKeyboard {
  const month = addMonths(startOfMonth(new Date()), monthOffset)

  const filtered = rows.filter((row) => {
    const date = new Date(row.starts_at)
    return date >= startOfMonth(month) && date <= endOfMonth(month)
  })

  const keyboard = new InlineKeyboard()
    .text('◀ Mese prec.', `calendario:${monthOffset - 1}`)
    .text('Mese succ. ▶', `calendario:${monthOffset + 1}`)

  for (const row of filtered) {
    const date = formatButtonDate(row.starts_at)
    const label = tournamentButtonLabel(statusIcon(row.status), date, row.stageNumber, row.name)
    keyboard.row().text(label, `torneo:${row.uuid}:m${monthOffset}`)
  }

  return keyboard
}

async function renderCalendario(monthOffset: number) {
  const rows = await fetchUpcomingTournaments()
  const month = addMonths(startOfMonth(new Date()), monthOffset)

  return {
    text: calendarioMessage(rows, month),
    keyboard: buildKeyboard(rows, monthOffset)
  }
}

export function registerCalendarioCommand(bot: Bot) {
  bot.command('calendario', async (ctx) => {
    try {
      const { text, keyboard } = await renderCalendario(0)
      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare i tornei, riprova più tardi.')
    }
  })

  bot.callbackQuery(/^calendario:(-?\d+)$/, async (ctx) => {
    const monthOffset = Number(ctx.match[1])

    // Answered exactly once, at the very end — a callback_query can only
    // be answered once (a second call throws GrammyError "query is too
    // old...", uncaught, taking down the whole webhook request with a 500;
    // confirmed 2026-09-03 as the actual cause behind "the bot doesn't
    // respond" whenever this handler's own error path used to fire).
    try {
      const { text, keyboard } = await renderCalendario(monthOffset)
      await editOrResendMessage(ctx, text, keyboard)
      await ctx.answerCallbackQuery()
    } catch {
      await answerLoadError(ctx)
    }
  })

  // The torneo:/iscrivi:/disiscrivi:/checkin-info: callbacks live in
  // tournament/detail.ts — leghe.ts's and iscrizioni.ts's own tournament
  // lists reach the same detail view, so it isn't calendario-specific.
  registerTournamentDetailHandlers(bot)
}
