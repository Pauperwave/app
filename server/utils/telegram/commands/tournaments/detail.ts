// server\utils\telegram\commands\tournaments\detail.ts

// A single tournament's detail view (message + registration actions), shared by calendario.ts,
// leghe.ts, iscrizioni.ts and prossimo.ts.
//
// torneoMenu's back button rebuilds the exact origin view (month/league/list) rather than using
// Menu's back()/nav(), which can't pass a fresh payload: every button carries `${uuid}:${origin}`.
// The origin view comes from menuNav.ts's registerBackResolver/getBackResolver registry, since
// importing each list command directly would create a circular import (they all import
// torneoMenu/openTournamentDetail).
import type { Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import { Menu } from '@grammyjs/menu'
import type { MenuFlavor } from '@grammyjs/menu'

import { formatTournamentDateTime, statusIcon, stageLabel } from './line'
import { fetchRegistrationStatus, fetchStageNumbers } from './queries'
import type { RegistrationStatus } from './queries'
import { NOT_LINKED_MESSAGE } from '../account/linking'
import { answerLoadError, requireChatId } from '../callbackErrors'
import { mapsUrl, googleCalendarUrl } from '../events/eventLinks'
import { navigateBack, getBackResolver } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'
import { ICONS } from '~~/server/utils/telegram/icons'

export interface LocationRow {
  name: string | null
  city: string | null
  address: string | null
  postal_code: string | null
  province: string | null
  country: string | null
  google_maps_url: string | null
}

export interface TournamentRow {
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
  organizer: { name: string | null, type: string | null } | null
}

export interface DatedTournamentRow extends TournamentRow {
  starts_at: string
  stageNumber: number | null
}

export const SELECT_COLUMNS = `
  uuid, name, starts_at, ends_at, description, entry_fee, prizes,
  contact_name, contact_phone, status, image_url, league_uuid,
  location:locations(name, city, address, postal_code, province, country, google_maps_url),
  organizer:organizations(name, type)
`

async function fetchTournament(uuid: string): Promise<DatedTournamentRow | null> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select(SELECT_COLUMNS)
    .eq('uuid', uuid)
    .maybeSingle()

  if (error) throw error
  const row = data as TournamentRow | null
  if (!row?.starts_at) return null

  // Scoped to this tournament's league (or none), see queries.ts's fetchStageNumbers
  const stageNumbers = await fetchStageNumbers(row.league_uuid ? [row.league_uuid] : [])
  return { ...row, starts_at: row.starts_at, stageNumber: stageNumbers.get(row.uuid) ?? null }
}

// openTournamentDetail() and torneoMenu's .dynamic() both fetch the row within one update (text,
// then buttons): memoizing per ctx halves the queries. associateUuid/registration are shared too,
// since a registration action re-triggers .dynamic() in the same update. See perContextCache.ts.
const memoize = createPerContextCache<{
  tournaments: Map<string, Promise<DatedTournamentRow | null>>
  associateUuid: Promise<string | null>
  registration: Promise<RegistrationStatus>
}>()

// Keyed by uuid, not a single slot: a caller resolving two tournaments in one update must get two
// real fetches
function cachedFetchTournament(ctx: Context, uuid: string): Promise<DatedTournamentRow | null> {
  const cache = memoize(ctx, 'tournaments', () => new Map())
  let entry = cache.get(uuid)
  if (!entry) {
    entry = fetchTournament(uuid)
    cache.set(uuid, entry)
  }
  return entry
}

function cachedResolveAssociateUuid(ctx: Context, chatId: number): Promise<string | null> {
  return memoize(ctx, 'associateUuid', () => resolveAssociateUuidByChatId(chatId))
}

function cachedFetchRegistrationStatus(
  ctx: Context, uuid: string, associateUuid: string
): Promise<RegistrationStatus> {
  return memoize(ctx, 'registration', () => fetchRegistrationStatus(uuid, associateUuid))
}

// A photo block (when the tournament has one) lives inside the same rich message as the text, so
// the whole view can be edited in place instead of deleted and resent (InputRichBlockPhoto).
//
// One `paragraph` block per line: a block's `text` is structured RichText, never parsed as
// markdown, so bold/links need real RichTextBold/RichTextUrl nodes, and per-line blocks avoid the
// \n-vs-\n\n question.
function tournamentDetailBlocks(row: DatedTournamentRow): InputRichMessage['blocks'] {
  const blocks: InputRichMessage['blocks'] = []
  if (row.image_url) blocks.push({ type: 'photo', photo: { type: 'photo', media: row.image_url } })

  blocks.push({
    type: 'paragraph',
    text: [`${statusIcon(row.status)} `, { type: 'bold', text: row.name }, stageLabel(row.stageNumber)]
  })

  const date = formatTournamentDateTime(row.starts_at)
  const endTime = row.ends_at ? ` – ${formatTelegramDate(row.ends_at, 'HH:mm')}` : ''
  blocks.push({ type: 'paragraph', text: `${ICONS.date} ${date}${endTime}` })

  const mapUrl = row.location ? mapsUrl(row.location) : null
  // Plain text, not a link: the "Direzioni" button below already covers the URL
  if (row.location?.name) blocks.push({ type: 'paragraph', text: `${ICONS.location} ${row.location.name}` })

  // Direzioni/Aggiungi al calendario as inline URL buttons next to the date/location they relate to
  // (like calendario.ts); plain UrlButtons need no callback handling
  const calendarUrl = googleCalendarUrl({
    name: row.name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    locationName: row.location?.name,
    description: row.description
  })
  blocks.push({
    type: 'buttons',
    buttons: [
      ...(mapUrl ? [{ text: `${ICONS.directions} Direzioni`, url: mapUrl }] : []),
      { text: `${ICONS.date} Aggiungi al calendario`, url: calendarUrl }
    ]
  })

  if (row.organizer?.name) blocks.push({ type: 'paragraph', text: `${ICONS.organizer} Organizzatore: ${row.organizer.name}` })
  if (row.contact_name) {
    const phone = row.contact_phone ? ` (${row.contact_phone})` : ''
    blocks.push({ type: 'paragraph', text: `${ICONS.phone} Referente: ${row.contact_name}${phone}` })
  }
  if (row.entry_fee !== null) blocks.push({ type: 'paragraph', text: `${ICONS.fee} Quota: ${row.entry_fee} €` })
  if (row.prizes) blocks.push({ type: 'paragraph', text: `${ICONS.trophy} Premi: ${row.prizes}` })
  if (row.description) blocks.push({ type: 'paragraph', text: row.description })

  return blocks
}

// Shop organizers (Magman etc.) are listed for visibility only: registration is their own business
function isExternalOrganizer(row: DatedTournamentRow): boolean {
  return row.organizer?.type === 'shop'
}

// Payload shared by every torneoMenu button: `${uuid}:${origin}`, where `origin` is a compact token
// for the back target: `m<monthOffset>`, `l<leagueIndex>`, `i` (iscrizioni) or `p` (prossimo)
function encodeTorneoPayload(uuid: string, origin: string): string {
  return `${uuid}:${origin}`
}

function decodeTorneoPayload(raw: string): { uuid: string, origin: string } {
  const separator = raw.indexOf(':')
  return { uuid: raw.slice(0, separator), origin: raw.slice(separator + 1) }
}

type BackOrigin = 'l' | 'i' | 'p' | 'm'

// Origin prefixes (`l<index>`, `i`, `p`, `m<monthOffset>` as fallback): the single source of truth
// for the origin encoding, used for the back button label (backLabel) and to find the resolver
// (getBackResolver)
function backResolverPrefix(origin: string): BackOrigin {
  if (origin.startsWith('l')) return 'l'
  if (origin === 'i' || origin === 'p') return origin
  return 'm'
}

function backLabel(prefix: BackOrigin): string {
  switch (prefix) {
    case 'l': return '« Torna alla lega'
    case 'i': return '« Torna ai tuoi tornei'
    case 'p': return '« Torna al prossimo torneo'
    case 'm': return '« Torna al mese'
  }
}

async function handleCancelRegistration(
  ctx: Context & MenuFlavor, tournamentUuid: string, linkedAssociateUuid: string
) {
  try {
    const supabase = telegramServiceSupabaseClient()
    const { data: existing, error: findError } = await supabase
      .from('tournament_registrations')
      .select('uuid, status, players!inner(associate_uuid)')
      .eq('tournament_uuid', tournamentUuid)
      .eq('players.associate_uuid', linkedAssociateUuid)
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

    const { error } = await supabase.from('tournament_registrations').delete().eq('uuid', existing.uuid)
    if (error) throw error

    // Overwrite needed before ctx.menu.update() re-renders the button, see perContextCache.ts
    memoize.set(ctx, 'registration', Promise.resolve(null))
    ctx.menu.update()
    await ctx.answerCallbackQuery({ text: `${ICONS.success} Iscrizione annullata.` })
  } catch {
    await ctx.answerCallbackQuery({ text: 'Errore durante l\'annullamento, riprova più tardi.', show_alert: true })
  }
}

async function handleRegister(
  ctx: Context & MenuFlavor, tournamentUuid: string, associateUuid: string | null
) {
  // associateUuid is already resolved by the caller: only the "not linked" alert is needed here
  if (!associateUuid) {
    await ctx.answerCallbackQuery({ text: NOT_LINKED_MESSAGE, show_alert: true })
    return
  }
  try {
    const supabase = telegramServiceSupabaseClient()
    if (await tournamentIsFull(supabase, tournamentUuid)) {
      await ctx.answerCallbackQuery({
        text: 'Posti esauriti: il torneo ha raggiunto il numero massimo di iscritti.',
        show_alert: true
      })
      return
    }
    const { error } = await supabase.rpc('register_tournament_players', {
      p_tournament_uuid: tournamentUuid,
      p_associate_uuids: [associateUuid]
    })
    if (error) throw error

    // Overwrite needed before ctx.menu.update() re-renders the button, see perContextCache.ts
    memoize.set(ctx, 'registration', Promise.resolve('registered'))
    ctx.menu.update()
    await ctx.answerCallbackQuery({ text: `${ICONS.success} Iscrizione confermata!` })
  } catch {
    await ctx.answerCallbackQuery({ text: 'Errore durante l\'iscrizione, riprova più tardi.', show_alert: true })
  }
}

// autoAnswer: false: every button answers with its own text, which would race Menu's auto-answer.
// onMenuOutdated: false: see calendario.ts's calendarioMenu.
export const torneoMenu = new Menu<Context>('t', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(async (ctx, range) => {
  const raw = ctx.match as string | undefined
  const chatId = ctx.chat?.id
  if (!raw || !chatId) return
  const { uuid, origin } = decodeTorneoPayload(raw)

  // Independent, so run in parallel
  const [tournament, associateUuid] = await Promise.all([
    cachedFetchTournament(ctx, uuid),
    cachedResolveAssociateUuid(ctx, chatId)
  ])
  if (!tournament) return

  const registration = associateUuid
    ? await cachedFetchRegistrationStatus(ctx, uuid, associateUuid)
    : null
  const payload = encodeTorneoPayload(uuid, origin)

  if (!isExternalOrganizer(tournament)) {
    if (registration === 'checked_in') {
      range.text({ text: `${ICONS.registrationCheckedIn} Check-in effettuato`, payload }, async (ctx) => {
        await ctx.answerCallbackQuery({
          text: 'Hai già fatto il check-in per questo torneo, non puoi più annullare l\'iscrizione da qui.',
          show_alert: true
        })
      })
    } else if (registration === 'registered' && associateUuid) {
      // associateUuid is already resolved above (registration is only non-null when it was truthy)
      const linkedAssociateUuid = associateUuid
      range.text(
        { text: `${ICONS.failure} Annulla iscrizione`, payload },
        ctx => handleCancelRegistration(ctx, uuid, linkedAssociateUuid)
      )
    } else if (tournament.status === 'registration_open') {
      range.text({ text: `${ICONS.register} Iscriviti`, payload }, ctx => handleRegister(ctx, uuid, associateUuid))
    }
  }

  const backPrefix = backResolverPrefix(origin)
  range.text({ text: backLabel(backPrefix), payload }, async (ctx) => {
    const buttonChatId = await requireChatId(ctx)
    if (!buttonChatId) return
    try {
      await navigateBack(ctx, () => getBackResolver(backPrefix)(ctx, origin, buttonChatId))
      await ctx.answerCallbackQuery()
    } catch {
      await answerLoadError(ctx)
    }
  })
})

// Registered unconditionally: torneoMenu is shared by four parents, not tied to one
// register*Command's bot.use()
registerMenu('t', torneoMenu)

// Opens the detail view fresh from a list (calendario/leghe/iscrizioni submenu buttons);
// torneoMenu's own buttons edit in place
export async function openTournamentDetail(ctx: Context, uuid: string, origin: string) {
  const chatId = await requireChatId(ctx)
  if (!chatId) return

  try {
    const tournament = await cachedFetchTournament(ctx, uuid)
    if (!tournament) {
      await ctx.answerCallbackQuery({ text: 'Torneo non trovato', show_alert: true })
      return
    }

    ctx.match = encodeTorneoPayload(uuid, origin)

    const blocks = tournamentDetailBlocks(tournament)
    await ctx.editMessageText({ blocks }, { reply_markup: torneoMenu })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}
