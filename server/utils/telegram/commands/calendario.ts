// server\utils\telegram\commands\calendario.ts
import { InlineKeyboard } from 'grammy'
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import type { Bot, Context } from 'grammy'

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
  status: string
  image_url: string | null
  league_uuid: string | null
  location: LocationRow | null
  organizer: { name: string | null } | null
}

interface DatedTournamentRow extends TournamentRow {
  starts_at: string
  stageNumber: number | null
}

const OPEN_STATUSES = ['registration_open', 'in_progress']
// Fetched once per render, filtered by month client-side — cheap enough for
// a league of this size, and keeps the callback handler stateless (no need
// to remember what a user was looking at between messages).
const MAX_ROWS = 200

const SELECT_COLUMNS = `
  uuid, name, starts_at, ends_at, description, entry_fee, prizes,
  contact_name, contact_phone, status, image_url, league_uuid,
  location:locations(name, city, address, postal_code, province, country, google_maps_url),
  organizer:organizations(name)
`

// Mirrors app/utils/tournaments/tournamentStageLabel.ts's
// assignTournamentStageNumbers: 1-based position within its own league,
// ordered by start date, cancelled stages skipped (don't get a number,
// don't count toward later ones). Needs the league's full history — not
// just the open/upcoming rows this bot otherwise fetches — so this is a
// deliberately separate, lightweight query (uuid/league_uuid/starts_at/
// status only) rather than reusing fetchUpcomingTournaments' result.
export async function fetchStageNumbers(): Promise<Map<string, number>> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select('uuid, league_uuid, starts_at, status')
    .is('deleted_at', null)
    .not('league_uuid', 'is', null)
    .order('starts_at', { ascending: true })

  if (error) throw error

  const byLeague = new Map<string, { uuid: string, status: string }[]>()
  for (const row of data) {
    if (!row.league_uuid) continue
    const list = byLeague.get(row.league_uuid) ?? []
    list.push({ uuid: row.uuid, status: row.status })
    byLeague.set(row.league_uuid, list)
  }

  const stageNumbers = new Map<string, number>()
  for (const list of byLeague.values()) {
    let position = 0
    for (const row of list) {
      if (row.status === 'cancelled') continue
      position += 1
      stageNumbers.set(row.uuid, position)
    }
  }
  return stageNumbers
}

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

async function fetchTournament(uuid: string): Promise<DatedTournamentRow | null> {
  const supabase = publicSupabaseClient()

  const [{ data, error }, stageNumbers] = await Promise.all([
    supabase
      .from('tournaments')
      .select(SELECT_COLUMNS)
      .eq('uuid', uuid)
      .maybeSingle(),
    fetchStageNumbers()
  ])

  if (error) throw error
  const row = data as TournamentRow | null
  return row?.starts_at
    ? { ...row, starts_at: row.starts_at, stageNumber: stageNumbers.get(row.uuid) ?? null }
    : null
}

export type RegistrationStatus = 'registered' | 'checked_in' | null

async function fetchRegistrationStatus(
  tournamentUuid: string, associateUuid: string
): Promise<RegistrationStatus> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('status, players!inner(associate_uuid)')
    .eq('tournament_uuid', tournamentUuid)
    .eq('players.associate_uuid', associateUuid)
    .maybeSingle()

  if (error) throw error
  return data?.status === 'checked_in' ? 'checked_in' : (data ? 'registered' : null)
}

// Batched variant of the above for a whole list of tournaments (leghe.ts's
// per-league view) — one query instead of one per tournament.
export async function fetchRegistrationStatuses(
  tournamentUuids: string[], associateUuid: string
): Promise<Map<string, RegistrationStatus>> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('tournament_uuid, status, players!inner(associate_uuid)')
    .in('tournament_uuid', tournamentUuids)
    .eq('players.associate_uuid', associateUuid)

  if (error) throw error

  const statuses = new Map<string, RegistrationStatus>()
  for (const row of data) {
    statuses.set(row.tournament_uuid, row.status === 'checked_in' ? 'checked_in' : 'registered')
  }
  return statuses
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

function dayLabel(date: Date): string {
  const label = format(date, 'EEEE d MMMM', { locale: it })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function stageLabel(row: DatedTournamentRow): string {
  return row.stageNumber ? ` — ${row.stageNumber}ª tappa` : ''
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
    const dayLines = dayRows.map((row) => {
      const location = row.location?.name ? `\n  📍 ${row.location.name}` : ''
      return `• ${row.name}${stageLabel(row)}${location}`
    })
    return `${dayHeader}\n${dayLines.join('\n')}`
  })

  return `${header}\n\n${days.join('\n\n')}\n\n👇 Tocca un torneo per i dettagli`
}

function tournamentDetailMessage(
  row: DatedTournamentRow, registration: RegistrationStatus
): string {
  const date = format(new Date(row.starts_at), 'EEEE d MMMM \'alle\' HH:mm', { locale: it })
  const endTime = row.ends_at ? ` – ${format(new Date(row.ends_at), 'HH:mm')}` : ''
  const lines = [`🎲 *${row.name}*${stageLabel(row)}`, '', `🗓️ ${date}${endTime}`]

  if (row.location?.name) {
    const url = mapsUrl(row.location)
    lines.push(url ? `📍 [${row.location.name}](${url})` : `📍 ${row.location.name}`)
  }
  if (row.organizer?.name) lines.push(`🏳️ Organizzatore: ${row.organizer.name}`)
  if (row.contact_name) lines.push(`☎️ Referente: ${row.contact_name}${row.contact_phone ? ` (${row.contact_phone})` : ''}`)
  if (row.entry_fee !== null) lines.push(`💶 Quota: ${row.entry_fee} €`)
  if (row.prizes) lines.push(`🏆 Premi: ${row.prizes}`)
  if (registration === 'registered') lines.push('', '✅ Sei iscritto a questo torneo.')
  if (registration === 'checked_in') lines.push('', '✅ Sei iscritto e hai già fatto il check-in.')
  if (row.description) lines.push('', row.description)

  return lines.join('\n')
}

// Telegram photo captions cap at 1024 characters (vs. 4096 for plain text
// messages) — only relevant when the detail is sent as a photo (image_url
// set), so this trims the description first rather than the fixed fields
// above it.
const CAPTION_LIMIT = 1024

function truncateForCaption(text: string): string {
  if (text.length <= CAPTION_LIMIT) return text
  return `${text.slice(0, CAPTION_LIMIT - 1)}…`
}

// A tournament's detail view is reachable from more than one place
// (calendario.ts's own month grid, leghe.ts's per-league tournament list,
// iscrizioni.ts's "my tournaments") — `origin` is a compact token
// (`m<monthOffset>` or `l<leagueIndex>`) carried through the torneo:/
// iscrivi:/disiscrivi: callback_data so the "back" button returns to
// whichever list the user actually came from, without any server-side
// session state (Nitro is serverless, see linking.ts's own reasoning).
// Kept short deliberately — callback_data has a hard 64-byte cap, and a
// second full UUID (a league's) wouldn't fit alongside the tournament's own.
function backTarget(origin: string): { label: string, data: string } {
  if (origin.startsWith('l')) {
    return { label: '« Torna alla lega', data: `lega:${origin.slice(1)}` }
  }
  return { label: '« Torna al mese', data: `calendario:${origin.slice(1)}` }
}

// Google Calendar's "render" endpoint accepts a prefilled event via query
// params — no auth, no backend of our own needed. Missing ends_at (not
// every tournament sets one) falls back to a 4-hour default block rather
// than omitting the button; better a rough estimate on the user's calendar
// than no calendar entry at all.
function googleCalendarUrl(row: DatedTournamentRow): string {
  const start = new Date(row.starts_at)
  const end = row.ends_at ? new Date(row.ends_at) : new Date(start.getTime() + 4 * 60 * 60 * 1000)
  const utcStamp = (date: Date) => `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: row.name,
    dates: `${utcStamp(start)}/${utcStamp(end)}`
  })
  if (row.location?.name) params.set('location', row.location.name)
  if (row.description) params.set('details', row.description)

  return `https://www.google.com/calendar/render?${params.toString()}`
}

function detailKeyboard(
  row: DatedTournamentRow, origin: string, registration: RegistrationStatus
): InlineKeyboard {
  const keyboard = new InlineKeyboard()
  if (registration === 'checked_in') {
    keyboard.row().text('🎯 Check-in effettuato', `checkin-info:${row.uuid}`)
  } else if (registration === 'registered') {
    keyboard.row().text('❌ Annulla iscrizione', `disiscrivi:${row.uuid}:${origin}`)
  } else if (row.status === 'registration_open') {
    keyboard.row().text('➕ Iscriviti', `iscrivi:${row.uuid}:${origin}`)
  }

  const mapUrl = row.location ? mapsUrl(row.location) : null
  const utilityRow = keyboard.row()
  if (mapUrl) utilityRow.url('🧭 Direzioni', mapUrl)
  utilityRow.url('🗓️ Aggiungi al calendario', googleCalendarUrl(row))

  const back = backTarget(origin)
  keyboard.row().text(back.label, back.data)
  return keyboard
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
    keyboard.row().text(`🎲 ${row.name}`, `torneo:${row.uuid}:m${monthOffset}`)
  }

  return keyboard
}

async function renderTournamentDetail(
  tournament: DatedTournamentRow, origin: string, chatId: number
) {
  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  const registration = associateUuid
    ? await fetchRegistrationStatus(tournament.uuid, associateUuid)
    : null

  return {
    text: tournamentDetailMessage(tournament, registration),
    keyboard: detailKeyboard(tournament, origin, registration)
  }
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
      // The detail view may have replaced this message with a photo one
      // (image_url tournaments) — editMessageText rejects that ("there is
      // no text in the message to edit"), so fall back to delete + resend.
      try {
        await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard })
      } catch {
        await ctx.deleteMessage().catch(() => {})
        await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard })
      }
      await ctx.answerCallbackQuery()
    } catch {
      await ctx.answerCallbackQuery({ text: 'Errore nel caricamento', show_alert: true }).catch(() => {})
    }
  })

  // origin: m<monthOffset> from calendario.ts's own grid, l<leagueIndex>
  // from leghe.ts's per-league tournament list — see backTarget's comment.
  bot.callbackQuery(/^torneo:([0-9a-f-]+):([lm]-?\d+)$/, async (ctx) => {
    const uuid = ctx.match[1]
    const origin = ctx.match[2]
    const chatId = ctx.chat?.id

    if (!uuid || !origin || !chatId) {
      await ctx.answerCallbackQuery().catch(() => {})
      return
    }

    try {
      const tournament = await fetchTournament(uuid)
      if (!tournament) {
        await ctx.answerCallbackQuery({ text: 'Torneo non trovato', show_alert: true })
        return
      }

      const { text, keyboard } = await renderTournamentDetail(tournament, origin, chatId)

      if (tournament.image_url) {
        // Can't turn an existing text message into a photo one via
        // editMessageText — replace it instead.
        await ctx.deleteMessage().catch(() => {})
        await ctx.replyWithPhoto(tournament.image_url, {
          caption: truncateForCaption(text),
          parse_mode: 'Markdown',
          reply_markup: keyboard
        })
      } else {
        await ctx.editMessageText(text, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
          link_preview_options: { is_disabled: true }
        })
      }
      await ctx.answerCallbackQuery()
    } catch {
      await ctx.answerCallbackQuery({ text: 'Errore nel caricamento', show_alert: true }).catch(() => {})
    }
  })

  // Re-renders the same detail message (photo caption or text) in place
  // after a successful iscriviti/disiscriviti, so the button reflects the
  // new registration state instead of just toasting a confirmation.
  async function refreshDetailMessage(
    ctx: Context, tournament: DatedTournamentRow, origin: string, chatId: number
  ) {
    const { text, keyboard } = await renderTournamentDetail(tournament, origin, chatId)
    if (tournament.image_url) {
      await ctx.editMessageCaption({ caption: truncateForCaption(text), parse_mode: 'Markdown', reply_markup: keyboard })
    } else {
      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
        link_preview_options: { is_disabled: true }
      })
    }
  }

  bot.callbackQuery(/^checkin-info:([0-9a-f-]+)$/, async (ctx) => {
    await ctx.answerCallbackQuery({
      text: 'Hai già fatto il check-in per questo torneo, non puoi più annullare l\'iscrizione da qui.',
      show_alert: true
    })
  })

  bot.callbackQuery(/^iscrivi:([0-9a-f-]+):([lm]-?\d+)$/, async (ctx) => {
    const uuid = ctx.match[1]
    const origin = ctx.match[2]
    const chatId = ctx.chat?.id
    if (!uuid || !origin || !chatId) return

    try {
      const associateUuid = await resolveAssociateUuidByChatId(chatId)
      if (!associateUuid) {
        await ctx.answerCallbackQuery({
          text: 'Devi prima collegare il tuo account: scrivimi la tua email da socio.',
          show_alert: true
        })
        return
      }

      const tournament = await fetchTournament(uuid)
      if (!tournament || tournament.status !== 'registration_open') {
        await ctx.answerCallbackQuery({
          text: 'Le iscrizioni per questo torneo non sono aperte.',
          show_alert: true
        })
        return
      }

      const supabase = telegramServiceSupabaseClient()
      const { error } = await supabase.rpc('register_tournament_players', {
        p_tournament_uuid: uuid,
        p_associate_uuids: [associateUuid]
      })
      if (error) throw error

      await refreshDetailMessage(ctx, tournament, origin, chatId)
      await ctx.answerCallbackQuery({ text: '✅ Iscrizione confermata!' })
    } catch {
      await ctx.answerCallbackQuery({ text: 'Errore durante l\'iscrizione, riprova più tardi.', show_alert: true })
    }
  })

  bot.callbackQuery(/^disiscrivi:([0-9a-f-]+):([lm]-?\d+)$/, async (ctx) => {
    const uuid = ctx.match[1]
    const origin = ctx.match[2]
    const chatId = ctx.chat?.id
    if (!uuid || !origin || !chatId) return

    try {
      const associateUuid = await resolveAssociateUuidByChatId(chatId)
      if (!associateUuid) {
        await ctx.answerCallbackQuery({ text: 'Nessun account collegato.', show_alert: true })
        return
      }

      const tournament = await fetchTournament(uuid)
      if (!tournament) {
        await ctx.answerCallbackQuery({ text: 'Torneo non trovato', show_alert: true })
        return
      }

      const supabase = telegramServiceSupabaseClient()
      const { data: existing, error: findError } = await supabase
        .from('tournament_registrations')
        .select('uuid, status, players!inner(associate_uuid)')
        .eq('tournament_uuid', uuid)
        .eq('players.associate_uuid', associateUuid)
        .maybeSingle()
      if (findError) throw findError

      if (!existing || existing.status !== 'registered') {
        await ctx.answerCallbackQuery({
          text: existing?.status === 'checked_in'
            ? 'Non puoi annullare l\'iscrizione dopo il check-in.'
            : 'Non risulti iscritto a questo torneo.',
          show_alert: true
        })
        return
      }

      const { error } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('uuid', existing.uuid)
      if (error) throw error

      await refreshDetailMessage(ctx, tournament, origin, chatId)
      await ctx.answerCallbackQuery({ text: '✅ Iscrizione annullata.' })
    } catch {
      await ctx.answerCallbackQuery({ text: 'Errore durante l\'annullamento, riprova più tardi.', show_alert: true })
    }
  })
}
