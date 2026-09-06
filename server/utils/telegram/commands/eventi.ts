// server\utils\telegram\commands\eventi.ts
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { answerLoadError } from './callbackErrors'
import { mapsUrl, googleCalendarUrl, truncateForCaption } from './eventLinks'
import type { MapsAddress } from './eventLinks'
import { navigateBack } from '../menuNav'

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

function eventLine(event: DatedEventRow): string {
  const date = formatTelegramDate(event.starts_at, 'd MMM', { locale: it })
  const location = event.location?.name ? ` — ${event.location.name}` : ''
  return `• ${date}: ${event.name}${location}`
}

function eventiMessage(events: DatedEventRow[]): FormattedString {
  if (!events.length) return new FormattedString('📅 Nessun evento in programma al momento.')

  const lines = events.map(eventLine)
  return fmt`📅 ${FormattedString.b('Prossimi eventi')}\n\n${FormattedString.join(lines, '\n')}\n\n👇 Tocca un evento per i dettagli`
}

// Exported so eventoMenu's "back" button can rebuild this exact list when
// returning from a detail page opened from here.
async function eventiText(): Promise<FormattedString> {
  return eventiMessage(await fetchUpcomingEvents())
}

function eventDetailMessage(event: EventRow): FormattedString {
  const date = event.starts_at
    ? formatTelegramDate(event.starts_at, 'EEEE d MMMM \'alle\' HH:mm', { locale: it })
    : 'Data da definire'
  const lines: (FormattedString | string)[] = [
    fmt`📅 ${FormattedString.b(event.name)}`,
    '',
    `🗓️ ${date}`
  ]

  if (event.location?.name) {
    const url = mapsUrl(event.location)
    lines.push(url ? fmt`📍 ${FormattedString.link(event.location.name, url)}` : `📍 ${event.location.name}`)
  }
  if (event.organizer?.name) lines.push(`🏳️ Organizzatore: ${event.organizer.name}`)

  return FormattedString.join(lines, '\n')
}

// autoAnswer: false — the "open event" buttons delegate to openEventDetail,
// which answers the callback itself. onMenuOutdated: false — see
// calendario.ts's calendarioMenu for why.
const eventiMenu = new Menu<Context>('ev', { autoAnswer: false, onMenuOutdated: false }).dynamic(async (ctx, range) => {
  const events = await fetchUpcomingEvents()
  for (const event of events) {
    const date = formatTelegramDate(event.starts_at, 'd MMM', { locale: it })
    const label = `📅 ${date} — ${event.name}`.slice(0, 64)
    range.row().submenu({ text: label, payload: event.uuid }, 'evd', openEventDetail)
  }
})

async function openEventDetail(ctx: Context & { match: string }) {
  try {
    const event = await fetchEvent(ctx.match)
    if (!event) {
      await ctx.answerCallbackQuery({ text: 'Evento non trovato', show_alert: true })
      return
    }
    const text = eventDetailMessage(event)

    if (event.image_url) {
      // Can't turn an existing text message into a photo one via
      // editMessageText — replace it instead.
      await ctx.deleteMessage().catch(() => {})
      const capped = truncateForCaption(text)
      await ctx.replyWithPhoto(event.image_url, {
        caption: capped.caption,
        caption_entities: capped.caption_entities,
        reply_markup: eventoMenu
      })
    } else {
      await ctx.editMessageText(text.text, {
        entities: text.entities,
        reply_markup: eventoMenu,
        link_preview_options: { is_disabled: true }
      })
    }
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

// No registration action here — unlike tournaments, events have no
// self-service participation flow yet (EventParticipants.vue is still a
// placeholder), so this is utility links + back only.
// autoAnswer: false — the back button answers itself; URL buttons never
// trigger a callback_query at all. onMenuOutdated: false — see
// calendario.ts's calendarioMenu for why.
const eventoMenu = new Menu<Context>('evd', { autoAnswer: false, onMenuOutdated: false }).dynamic(async (ctx, range) => {
  const uuid = ctx.match as string | undefined
  if (!uuid) return

  const event = await fetchEvent(uuid)
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

  range.text('« Torna agli eventi', async (ctx) => {
    try {
      await navigateBack(ctx, async () => ({ payload: '', menu: eventiMenu, text: await eventiText() }))
      await ctx.answerCallbackQuery()
    } catch {
      await answerLoadError(ctx)
    }
  })
})

export function registerEventiCommand(bot: Bot, commands: CommandGroup<Context>) {
  eventiMenu.register(eventoMenu)
  bot.use(eventiMenu)

  commands.command('eventi', 'Prossimi eventi', async (ctx) => {
    const message = await eventiText()
      .catch(() => new FormattedString('⚠️ Non sono riuscito a recuperare gli eventi, riprova più tardi.'))
    await ctx.reply(message.text, {
      entities: message.entities,
      reply_markup: eventiMenu,
      link_preview_options: { is_disabled: true }
    })
  })
}
