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

// Neither cache dedupes a same-update repeat today (eventiMenu/eventoMenu have no buttons
// re-running these fetches); kept per perContextCache.ts as cheap insurance, not a proven saving.
const memoize = createPerContextCache<{
  events: Promise<DatedEventRow[]>
  eventsByUuid: Map<string, Promise<EventRow | null>>
}>()

function cachedFetchUpcomingEvents(ctx: Context): Promise<DatedEventRow[]> {
  return memoize(ctx, 'events', () => fetchUpcomingEvents())
}

// Keyed by uuid, not a single slot: see detail.ts's cachedFetchTournament
function cachedFetchEvent(ctx: Context, uuid: string): Promise<EventRow | null> {
  const cache = memoize(ctx, 'eventsByUuid', () => new Map())
  let entry = cache.get(uuid)
  if (!entry) {
    entry = fetchEvent(uuid)
    cache.set(uuid, entry)
  }
  return entry
}

// A button under each event, as a "buttons" block in the rich message body (not a Menu
// reply_markup), like calendario.ts's list
const EV_OPEN_PREFIX = 'evopen:'

function encodeEvOpenPayload(uuid: string): string {
  return `${EV_OPEN_PREFIX}${uuid}`
}

function decodeEvOpenPayload(data: string): string {
  return data.slice(EV_OPEN_PREFIX.length)
}

function eventiBlocks(events: DatedEventRow[]): InputRichMessage['blocks'] {
  const blocks: InputRichMessage['blocks'] = [
    { type: 'heading', size: 3, text: `${ICONS.calendar} Prossimi eventi` }
  ]

  if (!events.length) {
    blocks.push({ type: 'paragraph', text: 'Nessun evento in programma al momento.' })
    return blocks
  }

  for (const event of events) {
    const date = formatTelegramDate(event.starts_at, 'd MMM', { locale: it })
    const location = event.location?.name ? ` — ${event.location.name}` : ''
    blocks.push({ type: 'paragraph', text: `${ICONS.calendar} ${date}: ${event.name}${location}` })
    blocks.push({
      type: 'buttons',
      buttons: [{ text: `${ICONS.openDetails} Apri dettagli`, callback_data: encodeEvOpenPayload(event.uuid) }]
    })
  }

  return blocks
}

// Exported so eventoMenu's "back" button can rebuild this list
async function eventiBlocksFor(ctx: Context): Promise<InputRichMessage['blocks']> {
  return eventiBlocks(await cachedFetchUpcomingEvents(ctx))
}

// A photo block (when the event has one) lives in the same rich message as the text, see
// detail.ts's tournamentDetailBlocks. One block per line, since RichText is never markdown-parsed.
//
// Direzioni/Aggiungi al calendario are inline "buttons" blocks right after the date/location, not
// in eventoMenu's reply_markup.
function eventDetailBlocks(event: EventRow): InputRichMessage['blocks'] {
  const date = event.starts_at
    ? formatTelegramDate(event.starts_at, 'EEEE d MMMM \'alle\' HH:mm', { locale: it })
    : 'Data da definire'

  const blocks: InputRichMessage['blocks'] = []
  if (event.image_url) blocks.push({ type: 'photo', photo: { type: 'photo', media: event.image_url } })
  blocks.push({ type: 'heading', size: 3, text: `${ICONS.calendar} ${event.name}` })
  blocks.push({ type: 'paragraph', text: `${ICONS.date} ${date}` })

  const mapUrl = event.location ? mapsUrl(event.location) : null
  // Plain text, not a link: the "Direzioni" button below already covers the URL
  if (event.location?.name) blocks.push({ type: 'paragraph', text: `${ICONS.location} ${event.location.name}` })

  // starts_at is nullable here (unlike the DatedEventRow of the list view): no calendar link
  // without a date
  const calendarUrl = event.starts_at
    ? googleCalendarUrl({
      name: event.name,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      locationName: event.location?.name
    })
    : null
  const linkButtons = [
    ...(mapUrl ? [{ text: `${ICONS.directions} Direzioni`, url: mapUrl }] : []),
    ...(calendarUrl ? [{ text: `${ICONS.date} Aggiungi al calendario`, url: calendarUrl }] : [])
  ]
  if (linkButtons.length) blocks.push({ type: 'buttons', buttons: linkButtons })

  if (event.organizer?.name) blocks.push({ type: 'paragraph', text: `${ICONS.organizer} Organizzatore: ${event.organizer.name}` })

  return blocks
}

// No buttons of its own (see EV_OPEN_PREFIX); kept so eventoMenu's send permission gets installed
// for this update
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
    // Set ctx.match before editing so eventoMenu's .dynamic() reads the right uuid (as in
    // openTournamentDetail)
    ctx.match = uuid
    const blocks = eventDetailBlocks(event)
    await ctx.editMessageText({ blocks }, { reply_markup: eventoMenu })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

// Handles taps on eventiBlocks's per-event "buttons" blocks; registered before bot.use(commands)
// (see registerEventiCommand), own callback_data prefix
async function handleEvOpenButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(EV_OPEN_PREFIX)) return next()

  await openEventDetail(ctx, decodeEvOpenPayload(data))
}

// Only the "back to eventi" button lives here: Direzioni/Aggiungi al calendario are inline
// rich-message blocks. autoAnswer: false: the back button answers its own callback. onMenuOutdated:
// false: see calendario.ts's calendarioMenu.
const eventoMenu = new Menu<Context>('evd', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(async (ctx, range) => {
  const uuid = ctx.match as string | undefined
  if (!uuid) return

  // payload: uuid, not omitted: an empty payload never reaches ctx.match and would fail the guard
  // above
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

// Extracted for reuse by t.me/<bot>?start=eventi (deepLinks.ts)
async function eventiCommandHandler(ctx: Context) {
  try {
    const blocks = await eventiBlocksFor(ctx)
    await ctx.replyWithRichMessage({ blocks }, { reply_markup: eventiMenu })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: `${ICONS.warning} Non sono riuscito a recuperare gli eventi, riprova più tardi.`
    })
  }
}

registerDeepLink('eventi', eventiCommandHandler)

export function registerEventiCommand(bot: Bot, commands: CommandGroup<Context>) {
  eventiMenu.register(eventoMenu)
  bot.use(eventiMenu)

  // Registered before bot.use(commands), like calendario.ts's handleCalendarioOpenButton
  bot.on('callback_query:data', handleEvOpenButton)

  commands.command('eventi', 'Prossimi eventi', eventiCommandHandler)
}
