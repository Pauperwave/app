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

function eventLine(event: DatedEventRow): string {
  const date = formatTelegramDate(event.starts_at, 'd MMM', { locale: it })
  const location = event.location?.name ? ` — ${event.location.name}` : ''
  // "- " (a real markdown list item), not "• " — a plain bullet character
  // is just text and still needs \n\n to break onto its own line; "- "
  // renders as a tight list on single \n. See core.ts's HELP_TEXT comment.
  return `- ${date}: ${event.name}${location}`
}

function eventiMarkdown(events: DatedEventRow[]): string {
  if (!events.length) return '📅 Nessun evento in programma al momento.'

  const lines = events.map(eventLine)
  return `## 📅 Prossimi eventi\n\n${lines.join('\n')}`
}

// Exported so eventoMenu's "back" button can rebuild this exact list when
// returning from a detail page opened from here.
async function eventiText(ctx: Context): Promise<string> {
  return eventiMarkdown(await cachedFetchUpcomingEvents(ctx))
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
function eventDetailBlocks(event: EventRow): InputRichMessage['blocks'] {
  const date = event.starts_at
    ? formatTelegramDate(event.starts_at, 'EEEE d MMMM \'alle\' HH:mm', { locale: it })
    : 'Data da definire'

  const blocks: InputRichMessage['blocks'] = []
  if (event.image_url) blocks.push({ type: 'photo', photo: { type: 'photo', media: event.image_url } })
  blocks.push({ type: 'heading', size: 3, text: `📅 ${event.name}` })
  blocks.push({ type: 'paragraph', text: `🗓️ ${date}` })

  if (event.location?.name) {
    const url = mapsUrl(event.location)
    const text = url
      ? ['📍 ', { type: 'url' as const, text: event.location.name, url }]
      : `📍 ${event.location.name}`
    blocks.push({ type: 'paragraph', text })
  }
  if (event.organizer?.name) blocks.push({ type: 'paragraph', text: `🏳️ Organizzatore: ${event.organizer.name}` })

  return blocks
}

// autoAnswer: false — the "open event" buttons delegate to openEventDetail,
// which answers the callback itself. onMenuOutdated: false — see
// calendario.ts's calendarioMenu for why.
const eventiMenu = new Menu<Context>('ev', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(async (ctx, range) => {
  const events = await cachedFetchUpcomingEvents(ctx)
  for (const event of events) {
    const date = formatTelegramDate(event.starts_at, 'd MMM', { locale: it })
    const label = `📅 ${date} — ${event.name}`.slice(0, 64)
    range.row().submenu({ text: label, payload: event.uuid }, 'evd', openEventDetail)
  }
})

async function openEventDetail(ctx: Context & { match: string }) {
  try {
    const event = await cachedFetchEvent(ctx, ctx.match)
    if (!event) {
      await ctx.answerCallbackQuery({ text: 'Evento non trovato', show_alert: true })
      return
    }
    const blocks = eventDetailBlocks(event)
    await ctx.editMessageText({ blocks }, { reply_markup: eventoMenu })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

// No registration action — events have no self-service participation flow
// yet (EventParticipants.vue is still a placeholder), just links + back.
// autoAnswer/onMenuOutdated: false — see calendario.ts's calendarioMenu.
const eventoMenu = new Menu<Context>('evd', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(async (ctx, range) => {
  const uuid = ctx.match as string | undefined
  if (!uuid) return

  const event = await cachedFetchEvent(ctx, uuid)
  if (!event || !event.starts_at) return

  const mapUrl = event.location ? mapsUrl(event.location) : null
  if (mapUrl) range.url('🧭 Direzioni', mapUrl)
  range.url('🗓️ Aggiungi al calendario', googleCalendarUrl({
    name: event.name,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    locationName: event.location?.name
  }))
  range.row()

  // payload: uuid (not omitted) — an empty payload never reaches ctx.match,
  // which would fail this dynamic()'s own `if (!uuid) return` guard above.
  range.text({ text: '« Torna agli eventi', payload: uuid }, async (ctx) => {
    try {
      await navigateBack(ctx, async () => ({
        payload: '',
        menu: eventiMenu,
        text: { markdown: await eventiText(ctx) }
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
  const markdown = await eventiText(ctx)
    .catch(() => '⚠️ Non sono riuscito a recuperare gli eventi, riprova più tardi.')
  await ctx.replyWithRichMessage({ markdown }, { reply_markup: eventiMenu })
}

registerDeepLink('eventi', eventiCommandHandler)

export function registerEventiCommand(bot: Bot, commands: CommandGroup<Context>) {
  eventiMenu.register(eventoMenu)
  bot.use(eventiMenu)

  commands.command('eventi', 'Prossimi eventi', eventiCommandHandler)
}
