// server\utils\telegram\commands\tornei.ts
import { InlineKeyboard } from 'grammy'
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import type { Bot } from 'grammy'

interface LocationRow {
  name: string | null
  city: string | null
  address: string | null
  postal_code: string | null
  province: string | null
  country: string | null
  google_maps_url: string | null
}

interface TournamentRow {
  uuid: string
  name: string
  starts_at: string | null
  ends_at: string | null
  description: string | null
  entry_fee: number | null
  prizes: string | null
  contact_name: string | null
  contact_phone: string | null
  format: { name: string | null } | null
  location: LocationRow | null
  organizer: { name: string | null } | null
}

interface DatedTournamentRow extends TournamentRow {
  starts_at: string
}

const OPEN_STATUSES = ['registration_open', 'in_progress']
// Fetched once per render, filtered by month client-side — cheap enough for
// a league of this size, and keeps the callback handler stateless (no need
// to remember what a user was looking at between messages).
const MAX_ROWS = 200

const SELECT_COLUMNS = `
  uuid, name, starts_at, ends_at, description, entry_fee, prizes,
  contact_name, contact_phone,
  format:mtg_formats(name),
  location:locations(name, city, address, postal_code, province, country, google_maps_url),
  organizer:organizations(name)
`

async function fetchUpcomingTournaments(): Promise<DatedTournamentRow[]> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select(SELECT_COLUMNS)
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

async function fetchTournament(uuid: string): Promise<DatedTournamentRow | null> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select(SELECT_COLUMNS)
    .eq('uuid', uuid)
    .maybeSingle()

  if (error) throw error
  const row = data as TournamentRow | null
  return row?.starts_at ? (row as DatedTournamentRow) : null
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

// google_maps_url (precise place link) takes priority over a generic
// address search, same precedence as TournamentDetailContent.vue.
function mapsUrl(location: LocationRow): string | null {
  if (location.google_maps_url) return location.google_maps_url
  if (!location.address) return null
  const query = [
    location.address, location.postal_code, location.city, location.province, location.country
  ].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function monthLabel(month: Date): string {
  return format(month, 'MMMM yyyy', { locale: it })
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

  const header = `🎲 *Tornei — ${monthLabel(month)}*${city ? ` _(${city})_` : ''}`

  if (!filtered.length) return `${header}\n\nNessun torneo in programma.`

  const lines = filtered.map((row) => {
    const date = format(new Date(row.starts_at), 'd MMM', { locale: it })
    const formatLabel = row.format?.name ? ` _[${row.format.name}]_` : ''
    const location = row.location?.name ? ` — 📍 ${row.location.name}` : ''
    return `*${date}*: ${row.name}${formatLabel}${location}`
  })

  return `${header}\n\n${lines.join('\n')}\n\n👇 Tocca un torneo per i dettagli`
}

function tournamentDetailMessage(row: DatedTournamentRow): string {
  const date = format(new Date(row.starts_at), 'EEEE d MMMM \'alle\' HH:mm', { locale: it })
  const endTime = row.ends_at ? ` – ${format(new Date(row.ends_at), 'HH:mm')}` : ''
  const formatLabel = row.format?.name ? ` _[${row.format.name}]_` : ''

  const lines = [`🎲 *${row.name}*${formatLabel}`, '', `🗓️ ${date}${endTime}`]

  if (row.location?.name) {
    const url = mapsUrl(row.location)
    lines.push(url ? `📍 [${row.location.name}](${url})` : `📍 ${row.location.name}`)
  }
  if (row.organizer?.name) lines.push(`🏳️ Organizzatore: ${row.organizer.name}`)
  if (row.contact_name) lines.push(`☎️ Referente: ${row.contact_name}${row.contact_phone ? ` (${row.contact_phone})` : ''}`)
  if (row.entry_fee !== null) lines.push(`💶 Quota: ${row.entry_fee} €`)
  if (row.prizes) lines.push(`🏆 Premi: ${row.prizes}`)
  if (row.description) lines.push('', row.description)

  return lines.join('\n')
}

function buildKeyboard(
  rows: DatedTournamentRow[], monthOffset: number, cityIndex: number
): InlineKeyboard {
  const cities = buildCityList(rows)
  const month = addMonths(startOfMonth(new Date()), monthOffset)
  const city = cityIndex > 0 ? (cities[cityIndex - 1] ?? null) : null

  const filtered = rows.filter((row) => {
    const date = new Date(row.starts_at)
    if (date < startOfMonth(month) || date > endOfMonth(month)) return false
    if (city && cityOf(row) !== city) return false
    return true
  })

  const keyboard = new InlineKeyboard()
    .text('◀', `tornei:${monthOffset - 1}:${cityIndex}`)
    .text(monthLabel(month), `tornei:0:${cityIndex}`)
    .text('▶', `tornei:${monthOffset + 1}:${cityIndex}`)

  if (cities.length > 1) {
    keyboard.row()
    keyboard.text(cityIndex === 0 ? '• Tutte' : 'Tutte', `tornei:${monthOffset}:0`)
    cities.forEach((cityName, index) => {
      const label = cityIndex === index + 1 ? `• ${cityName}` : cityName
      keyboard.text(label, `tornei:${monthOffset}:${index + 1}`)
    })
  }

  for (const row of filtered) {
    keyboard.row().text(`🎲 ${row.name}`, `torneo:${row.uuid}:${monthOffset}:${cityIndex}`)
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

  bot.callbackQuery(/^torneo:([0-9a-f-]+):(-?\d+):(\d+)$/, async (ctx) => {
    const uuid = ctx.match[1]
    const monthOffset = Number(ctx.match[2])
    const cityIndex = Number(ctx.match[3])
    await ctx.answerCallbackQuery()

    if (!uuid) return

    try {
      const tournament = await fetchTournament(uuid)
      if (!tournament) {
        await ctx.answerCallbackQuery({ text: 'Torneo non trovato', show_alert: true })
        return
      }

      const keyboard = new InlineKeyboard()
        .text('« Torna al mese', `tornei:${monthOffset}:${cityIndex}`)

      await ctx.editMessageText(tournamentDetailMessage(tournament), {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
        link_preview_options: { is_disabled: true }
      })
    } catch {
      await ctx.answerCallbackQuery({ text: 'Errore nel caricamento', show_alert: true })
    }
  })
}
