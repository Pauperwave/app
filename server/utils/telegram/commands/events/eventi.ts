// server\utils\telegram\commands\events\eventi.ts
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'

import { answerLoadError } from '../callbackErrors'
import { mapsUrl, googleCalendarUrl } from './eventLinks'
import type { MapsAddress } from './eventLinks'
import { navigateBack } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'
import { ICONS } from '../../icons'
import { registerDeepLink } from '../../deepLinks'

interface EventRow {
  uuid: string
  name: string
  starts_at: string | null
  ends_at: string | null
  image_url: string | null
  location: (MapsAddress & { name: string | null }) | null
  organizer: { name: string | null } | null
}

interface DatedEventRow extends EventRow {
  starts_at: string
}

const MAX_EVENTS = 8

const SELECT_COLUMNS = `
  uuid, name, starts_at, ends_at, image_url,
  location:locations(name, address, postal_code, city, province, country, google_maps_url),
  organizer:organizations(name)
`

async function fetchUpcomingEvents(): Promise<DatedEventRow[]> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('events')
    .select(SELECT_COLUMNS)
    .is('deleted_at', null)
    .in('status', ['published', 'ongoing'])
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(MAX_EVENTS)

  if (error) throw error
  return (data as EventRow[])
    .filter((row): row is DatedEventRow => row.starts_at !== null)
}

async function fetchEvent(uuid: string): Promise<EventRow | null> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('events')
    .select(SELECT_COLUMNS)
    .eq('uuid', uuid)
    .maybeSingle()

  if (error) throw error
  return data as EventRow | null
}

// The command handler / back-button and each menu's own .dynamic() re-render
// both re-run these same queries within the same update — memoizing by ctx
// dedupes them. See perContextCache.ts.
const memoize = createPerContextCache<{
  events: Promise<DatedEventRow[]>
  event: Promise<EventRow | null>
}>()

function cachedFetchUpcomingEvents(ctx: Context): Promise<DatedEventRow[]> {
  return memoize(ctx, 'events', () => fetchUpcomingEvents())
}

function cachedFetchEvent(ctx: Context, uuid: string): Promise<EventRow | null> {
  return memoize(ctx, 'event', () => fetchEvent(uuid))
}

// A button right under each event, embedded as its own "buttons" block in
// the rich message body — not a Menu-managed reply_markup — same "buttons
// near their own content" pattern as calendario.ts's own list (user
// request 2026-09-09, applied to eventi.ts's two screens too).
const EV_OPEN_PREFIX = 'evopen:'

function encodeEvOpenPayload(uuid: string): string {
  return `${EV_OPEN_PREFIX}${uuid}`
}

function decodeEvOpenPayload(data: string): string {
  return data.slice(EV_OPEN_PREFIX.length)
}

function eventiBlocks(events: DatedEventRow[]): InputRichMessage['blocks'] {
  const blocks: InputRichMessage['blocks'] = [
    { type: 'heading', size: 3, text: '📅 Prossimi eventi' }
  ]

  if (!events.length) {
    blocks.push({ type: 'paragraph', text: 'Nessun evento in programma al momento.' })
    return blocks
  }

  for (const event of events) {
    const date = formatTelegramDate(event.starts_at, 'd MMM', { locale: it })
    const location = event.location?.name ? ` — ${event.location.name}` : ''
    blocks.push({ type: 'paragraph', text: `📅 ${date}: ${event.name}${location}` })
    blocks.push({
      type: 'buttons',
      buttons: [{ text: `${ICONS.openDetails} Apri dettagli`, callback_data: encodeEvOpenPayload(event.uuid) }]
    })
  }

  return blocks
}

// Exported so eventoMenu's "back" button can rebuild this exact list when
// returning from a detail page opened from here.
async function eventiBlocksFor(ctx: Context): Promise<InputRichMessage['blocks']> {
  return eventiBlocks(await cachedFetchUpcomingEvents(ctx))
}

// A photo block (when the event has one) lives inside the same rich
// message as the text — see detail.ts's tournamentDetailBlocks for the
// full reasoning (InputRichBlockPhoto lets editMessageText update image
// + text on one message, instead of the old delete+resend-as-photo).
//
// One block per line, not a joined markdown string — a block's `text` is
// structured RichText and is never markdown-parsed, so "**bold**"/
// "[text](url)" show up literally instead of rendering (confirmed
// 2026-09-09 from the actual bot output). See tournamentDetailBlocks's
// own comment for the same reasoning.
//
// Direzioni/Aggiungi al calendario live inline here too, as a "buttons"
// block right after the date/location they relate to — not in eventoMenu's
// own reply_markup — same reasoning as tournamentDetailBlocks's own
// Direzioni/Aggiungi al calendario buttons.
function eventDetailBlocks(event: EventRow): InputRichMessage['blocks'] {
  const date = event.starts_at
    ? formatTelegramDate(event.starts_at, 'EEEE d MMMM \'alle\' HH:mm', { locale: it })
    : 'Data da definire'

  const blocks: InputRichMessage['blocks'] = []
  if (event.image_url) blocks.push({ type: 'photo', photo: { type: 'photo', media: event.image_url } })
  blocks.push({ type: 'heading', size: 3, text: `📅 ${event.name}` })
  blocks.push({ type: 'paragraph', text: `🗓️ ${date}` })

  const mapUrl = event.location ? mapsUrl(event.location) : null
  // Plain text, not a link — the "🧭 Direzioni" button just below already
  // covers this exact URL, so a second inline hyperlink was redundant.
  if (event.location?.name) blocks.push({ type: 'paragraph', text: `📍 ${event.location.name}` })

  // event.starts_at is nullable on this row (unlike the guaranteed-dated
  // DatedEventRow the list view uses) — no calendar link without a date.
  const calendarUrl = event.starts_at
    ? googleCalendarUrl({
      name: event.name,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      locationName: event.location?.name
    })
    : null
  const linkButtons = [
    ...(mapUrl ? [{ text: '🧭 Direzioni', url: mapUrl }] : []),
    ...(calendarUrl ? [{ text: '🗓️ Aggiungi al calendario', url: calendarUrl }] : [])
  ]
  if (linkButtons.length) blocks.push({ type: 'buttons', buttons: linkButtons })

  if (event.organizer?.name) blocks.push({ type: 'paragraph', text: `🏢 Organizzatore: ${event.organizer.name}` })

  return blocks
}

// No buttons of its own any more (see EV_OPEN_PREFIX above) — kept only so
// eventoMenu's send permission gets installed for this update, matching
// iscrizioniMenu's own reasoning.
const eventiMenu = new Menu<Context>('ev', {
  autoAnswer: false,
  onMenuOutdated: false
})

async function openEventDetail(ctx: Context, uuid: string) {
  try {
    const event = await cachedFetchEvent(ctx, uuid)
    if (!event) {
      await ctx.answerCallbackQuery({ text: 'Evento non trovato', show_alert: true })
      return
    }
    // Sets ctx.match before editing so eventoMenu's own .dynamic() (re-run
    // by grammY right after, to build the reply_markup) reads the right
    // uuid — same pattern as tournament/detail.ts's openTournamentDetail.
    ctx.match = uuid
    const blocks = eventDetailBlocks(event)
    await ctx.editMessageText({ blocks }, { reply_markup: eventoMenu })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

// Handles taps on eventiBlocks's own per-event "buttons" blocks — registered
// before bot.use(commands) (see registerEventiCommand), distinct
// callback_data prefix so it only ever claims its own presses.
async function handleEvOpenButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(EV_OPEN_PREFIX)) return next()

  await openEventDetail(ctx, decodeEvOpenPayload(data))
}

// Only the "back to eventi" button lives here now — Direzioni/Aggiungi al
// calendario are inline rich-message "buttons" blocks (see
// eventDetailBlocks above), not Menu-managed reply_markup.
// autoAnswer: false — the back button answers its own callback.
// onMenuOutdated: false — see calendario.ts's calendarioMenu for why.
const eventoMenu = new Menu<Context>('evd', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(async (ctx, range) => {
  const uuid = ctx.match as string | undefined
  if (!uuid) return

  // payload: uuid (not omitted) — an empty payload never reaches ctx.match,
  // which would fail this dynamic()'s own `if (!uuid) return` guard above.
  range.text({ text: '« Torna agli eventi', payload: uuid }, async (ctx) => {
    try {
      await navigateBack(ctx, async () => ({
        payload: '',
        menu: eventiMenu,
        text: { blocks: await eventiBlocksFor(ctx) }
      }))
      await ctx.answerCallbackQuery()
    } catch {
      await answerLoadError(ctx)
    }
  })
})

// Extracted so it can be reused verbatim by t.me/<bot>?start=eventi — see
// deepLinks.ts.
async function eventiCommandHandler(ctx: Context) {
  try {
    const blocks = await eventiBlocksFor(ctx)
    await ctx.replyWithRichMessage({ blocks }, { reply_markup: eventiMenu })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: '⚠️ Non sono riuscito a recuperare gli eventi, riprova più tardi.'
    })
  }
}

registerDeepLink('eventi', eventiCommandHandler)

export function registerEventiCommand(bot: Bot, commands: CommandGroup<Context>) {
  eventiMenu.register(eventoMenu)
  bot.use(eventiMenu)

  // Registered before bot.use(commands) — same reasoning as calendario.ts's
  // own handleCalendarioOpenButton registration.
  bot.on('callback_query:data', handleEvOpenButton)

  commands.command('eventi', 'Prossimi eventi', eventiCommandHandler)
}
