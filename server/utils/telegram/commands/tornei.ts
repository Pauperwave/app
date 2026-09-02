// server\utils\telegram\commands\tornei.ts
import { InlineKeyboard } from 'grammy'
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import type { Bot } from 'grammy'

interface TournamentRow {
  name: string
  starts_at: string | null
  format: { name: string | null } | null
  location: { name: string | null, city: string | null } | null
}

interface DatedTournamentRow extends TournamentRow {
  starts_at: string
}

const OPEN_STATUSES = ['registration_open', 'in_progress']
// Fetched once per render, filtered by month client-side — cheap enough for
// a league of this size, and keeps the callback handler stateless (no need
// to remember what a user was looking at between messages).
const MAX_ROWS = 200

async function fetchUpcomingTournaments(): Promise<DatedTournamentRow[]> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select('name, starts_at, format:mtg_formats(name), location:locations(name, city)')
    .is('deleted_at', null)
    .in('status', OPEN_STATUSES)
    .gte('starts_at', startOfMonth(new Date()).toISOString())
    .order('starts_at', { ascending: true })
    .limit(MAX_ROWS)

  if (error) throw error
  return (data as TournamentRow[]).filter(
    (row): row is DatedTournamentRow => row.starts_at !== null
  )
}

function cityOf(row: TournamentRow): string | null {
  return row.location?.city ?? null
}

function buildCityList(rows: DatedTournamentRow[]): string[] {
  const cities = new Set<string>()
  for (const row of rows) {
    const city = cityOf(row)
    if (city) cities.add(city)
  }
  return [...cities].sort((a, b) => a.localeCompare(b))
}

function tourneiMessage(rows: DatedTournamentRow[], month: Date, city: string | null): string {
  const start = startOfMonth(month)
  const end = endOfMonth(month)

  const filtered = rows.filter((row) => {
    const date = new Date(row.starts_at)
    if (date < start || date > end) return false
    if (city && cityOf(row) !== city) return false
    return true
  })

  const monthLabel = format(month, 'MMMM yyyy', { locale: it })
  const header = `🎲 *Tornei — ${monthLabel}*${city ? ` (${city})` : ''}`

  if (!filtered.length) return `${header}\n\nNessun torneo in programma.`

  const lines = filtered.map((row) => {
    const date = format(new Date(row.starts_at), 'd MMM', { locale: it })
    const formatLabel = row.format?.name ? ` [${row.format.name}]` : ''
    const location = row.location?.name ? ` — ${row.location.name}` : ''
    return `• ${date}: ${row.name}${formatLabel}${location}`
  })

  return `${header}\n\n${lines.join('\n')}`
}

function buildKeyboard(
  rows: DatedTournamentRow[], monthOffset: number, cityIndex: number
): InlineKeyboard {
  const cities = buildCityList(rows)

  const keyboard = new InlineKeyboard()
    .text('◀', `tornei:${monthOffset - 1}:${cityIndex}`)
    .text('Oggi', `tornei:0:${cityIndex}`)
    .text('▶', `tornei:${monthOffset + 1}:${cityIndex}`)

  if (cities.length > 1) {
    keyboard.row()
    keyboard.text(cityIndex === 0 ? '• Tutte' : 'Tutte', `tornei:${monthOffset}:0`)
    cities.forEach((city, index) => {
      const label = cityIndex === index + 1 ? `• ${city}` : city
      keyboard.text(label, `tornei:${monthOffset}:${index + 1}`)
    })
  }

  return keyboard
}

async function renderTornei(monthOffset: number, cityIndex: number) {
  const rows = await fetchUpcomingTournaments()
  const month = addMonths(startOfMonth(new Date()), monthOffset)
  const cities = buildCityList(rows)
  const city = cityIndex > 0 ? (cities[cityIndex - 1] ?? null) : null

  return {
    text: tourneiMessage(rows, month, city),
    keyboard: buildKeyboard(rows, monthOffset, cityIndex)
  }
}

export function registerTorneiCommand(bot: Bot) {
  bot.command('tornei', async (ctx) => {
    try {
      const { text, keyboard } = await renderTornei(0, 0)
      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare i tornei, riprova più tardi.')
    }
  })

  bot.callbackQuery(/^tornei:(-?\d+):(\d+)$/, async (ctx) => {
    const monthOffset = Number(ctx.match[1])
    const cityIndex = Number(ctx.match[2])
    await ctx.answerCallbackQuery()

    try {
      const { text, keyboard } = await renderTornei(monthOffset, cityIndex)
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard })
    } catch {
      await ctx.answerCallbackQuery({ text: 'Errore nel caricamento', show_alert: true })
    }
  })
}
