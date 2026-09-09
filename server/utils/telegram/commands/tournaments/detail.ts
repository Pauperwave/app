// server\utils\telegram\commands\tournaments\detail.ts

// A single tournament's detail view (message + registration actions),
// shared by calendario.ts, leghe.ts, iscrizioni.ts and prossimo.ts — split
// out of calendario.ts (2026-09-03) once it grew too large.
//
// torneoMenu's back button rebuilds the exact origin view (month/league/
// list) instead of using Menu's built-in back()/nav(), which can't hand the
// target menu a fresh payload — every button therefore carries
// `${uuid}:${origin}` so both survive a full round trip.
import type { Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import { Menu } from '@grammyjs/menu'
import type { MenuFlavor } from '@grammyjs/menu'

import { formatTournamentDateTime, statusIcon, stageLabel } from './line'
import { fetchRegistrationStatus, fetchStageNumbers } from './queries'
import type { RegistrationStatus } from './queries'
import { NOT_LINKED_MESSAGE } from '../account/linking'
import { answerLoadError, requireChatId } from '../callbackErrors'
import { ICONS } from '../../icons'
import { mapsUrl, googleCalendarUrl } from '../events/eventLinks'
import { navigateBack, getMenu } from '../../menuNav'
import type { MenuNavTarget } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'
// Circular import (calendario/leghe/iscrizioni import torneoMenu, this
// imports their text-renderers back) — safe since only used inside async
// handlers. Menu objects themselves come via menuNav.ts's registry instead.
import { calendarioMarkdownFor } from './calendario'
import { legaTorneiMarkdown } from './leghe'
import { iscrizioniMarkdown } from './iscrizioni'
import { prossimoMarkdown } from './prossimo'

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

  // Scoped to this tournament's own league (or none) — see queries.ts's
  // own comment on why fetchStageNumbers takes a league filter.
  const stageNumbers = await fetchStageNumbers(row.league_uuid ? [row.league_uuid] : [])
  return { ...row, starts_at: row.starts_at, stageNumber: stageNumbers.get(row.uuid) ?? null }
}

// openTournamentDetail() and torneoMenu's own .dynamic() independently run
// these same three queries within the same update (once for the message
// text, once for the buttons) — memoizing by ctx halves the query count on
// every tournament-detail open. See perContextCache.ts for why this works.
const memoize = createPerContextCache<{
  tournament: Promise<DatedTournamentRow | null>
  associateUuid: Promise<string | null>
  registration: Promise<RegistrationStatus>
}>()

function cachedFetchTournament(ctx: Context, uuid: string): Promise<DatedTournamentRow | null> {
  return memoize(ctx, 'tournament', () => fetchTournament(uuid))
}

function cachedResolveAssociateUuid(ctx: Context, chatId: number): Promise<string | null> {
  return memoize(ctx, 'associateUuid', () => resolveAssociateUuidByChatId(chatId))
}

function cachedFetchRegistrationStatus(
  ctx: Context, uuid: string, associateUuid: string
): Promise<RegistrationStatus> {
  return memoize(ctx, 'registration', () => fetchRegistrationStatus(uuid, associateUuid))
}

// A photo block (when the tournament has one) lives inside the same rich
// message as the text — not a separate replyWithPhoto — so the whole view,
// image included, can be edited in place instead of deleted and resent.
// Confirmed 2026-09-09: InputRichBlockPhoto exists specifically for this;
// editMessageText already supports editing text<->rich_message on one
// message, so folding the photo into a block removes the old text/photo
// message-type mismatch that forced a delete+recreate.
function tournamentDetailBlocks(
  row: DatedTournamentRow, registration: RegistrationStatus
): InputRichMessage['blocks'] {
  const date = formatTournamentDateTime(row.starts_at)
  const endTime = row.ends_at ? ` – ${formatTelegramDate(row.ends_at, 'HH:mm')}` : ''
  const lines: string[] = [
    `${statusIcon(row.status)} **${row.name}**${stageLabel(row.stageNumber)}`,
    `🗓️ ${date}${endTime}`
  ]

  if (row.location?.name) {
    const url = mapsUrl(row.location)
    lines.push(url ? `📍 [${row.location.name}](${url})` : `📍 ${row.location.name}`)
  }
  if (row.organizer?.name) lines.push(`🏳️ Organizzatore: ${row.organizer.name}`)
  if (row.contact_name) {
    const phone = row.contact_phone ? ` (${row.contact_phone})` : ''
    lines.push(`☎️ Referente: ${row.contact_name}${phone}`)
  }
  if (row.entry_fee !== null) lines.push(`💶 Quota: ${row.entry_fee} €`)
  if (row.prizes) lines.push(`🏆 Premi: ${row.prizes}`)
  if (registration === 'registered') lines.push(`${ICONS.registrationRegistered} Sei iscritto a questo torneo.`)
  if (registration === 'checked_in') lines.push(`${ICONS.registrationCheckedIn} Sei iscritto e hai già fatto il check-in.`)
  if (row.description) lines.push(row.description)

  const blocks: InputRichMessage['blocks'] = []
  if (row.image_url) blocks.push({ type: 'photo', photo: { type: 'photo', media: row.image_url } })
  // \n\n, not \n — see core.ts's HELP_TEXT comment on Rich Message markdown.
  blocks.push({ type: 'paragraph', text: lines.join('\n\n') })
  return blocks
}

// Shop organizers (Magman etc.) show up for schedule visibility, but
// registration is their own business — Iscriviti/Annulla/check-in only
// ever manages tournament_registrations for the club's own tournaments.
function isExternalOrganizer(row: DatedTournamentRow): boolean {
  return row.organizer?.type === 'shop'
}

// Payload shared by every torneoMenu button: `${uuid}:${origin}`. `origin`
// is a compact token identifying where to go back to: `m<monthOffset>`,
// `l<leagueIndex>`, `i` (iscrizioni), or `p` (prossimo).
function encodeTorneoPayload(uuid: string, origin: string): string {
  return `${uuid}:${origin}`
}

function decodeTorneoPayload(raw: string): { uuid: string, origin: string } {
  const separator = raw.indexOf(':')
  return { uuid: raw.slice(0, separator), origin: raw.slice(separator + 1) }
}

// Cheap label for the back button — the expensive part (resolveBackTarget)
// only runs once the button is actually pressed.
function backLabel(origin: string): string {
  if (origin.startsWith('l')) return '« Torna alla lega'
  if (origin === 'i') return '« Torna ai tuoi tornei'
  if (origin === 'p') return '« Torna al prossimo torneo'
  return '« Torna al mese'
}

// Rebuilds the exact origin view so "back" restores precisely where the
// user came from. Menu instance resolved via menuNav.ts's registry
// (getMenu), not a direct import — see that file's own comment for why.
async function resolveBackTarget(
  ctx: Context, origin: string, chatId: number
): Promise<MenuNavTarget> {
  if (origin.startsWith('l')) {
    const index = Number(origin.slice(1))
    const markdown = await legaTorneiMarkdown(ctx, index, chatId) ?? '🏆 Lega non trovata.'
    return { payload: String(index), menu: getMenu('lt'), text: { markdown } }
  }
  if (origin === 'i') {
    return { payload: '', menu: getMenu('isc'), text: { markdown: await iscrizioniMarkdown(ctx, chatId) } }
  }
  if (origin === 'p') {
    return { payload: '', menu: getMenu('p'), text: { markdown: await prossimoMarkdown(ctx) } }
  }
  const offset = Number(origin.slice(1))
  const markdown = await calendarioMarkdownFor(ctx, offset, chatId)
  return { payload: String(offset), menu: getMenu('cal'), text: { markdown } }
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

    ctx.menu.update()
    await ctx.answerCallbackQuery({ text: '✅ Iscrizione annullata.' })
  } catch {
    await ctx.answerCallbackQuery({ text: 'Errore durante l\'annullamento, riprova più tardi.', show_alert: true })
  }
}

async function handleRegister(
  ctx: Context & MenuFlavor, tournamentUuid: string, associateUuid: string | null
) {
  // associateUuid already resolved by the caller — only the "not linked"
  // alert needs to happen here.
  if (!associateUuid) {
    await ctx.answerCallbackQuery({ text: NOT_LINKED_MESSAGE, show_alert: true })
    return
  }
  try {
    const supabase = telegramServiceSupabaseClient()
    const { error } = await supabase.rpc('register_tournament_players', {
      p_tournament_uuid: tournamentUuid,
      p_associate_uuids: [associateUuid]
    })
    if (error) throw error

    ctx.menu.update()
    await ctx.answerCallbackQuery({ text: '✅ Iscrizione confermata!' })
  } catch {
    await ctx.answerCallbackQuery({ text: 'Errore durante l\'iscrizione, riprova più tardi.', show_alert: true })
  }
}

// autoAnswer: false — every button below answers with its own confirmation/
// error text, which would race with Menu's default no-args auto-answer.
// onMenuOutdated: false — see calendario.ts's calendarioMenu for why.
export const torneoMenu = new Menu<Context>('t', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(async (ctx, range) => {
  const raw = ctx.match as string | undefined
  const chatId = ctx.chat?.id
  if (!raw || !chatId) return
  const { uuid, origin } = decodeTorneoPayload(raw)

  // Independent of each other — parallelized instead of two sequential awaits.
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
      range.text({ text: '🎯 Check-in effettuato', payload }, async (ctx) => {
        await ctx.answerCallbackQuery({
          text: 'Hai già fatto il check-in per questo torneo, non puoi più annullare l\'iscrizione da qui.',
          show_alert: true
        })
      })
    } else if (registration === 'registered' && associateUuid) {
      // associateUuid already resolved above (registration only comes back
      // non-null when it was truthy) — no need to re-query it here.
      const linkedAssociateUuid = associateUuid
      range.text(
        { text: '❌ Annulla iscrizione', payload },
        ctx => handleCancelRegistration(ctx, uuid, linkedAssociateUuid)
      )
    } else if (tournament.status === 'registration_open') {
      range.text({ text: '➕ Iscriviti', payload }, ctx => handleRegister(ctx, uuid, associateUuid))
    }
  }

  const mapUrl = tournament.location ? mapsUrl(tournament.location) : null
  if (mapUrl) range.url('🧭 Direzioni', mapUrl)
  range.url('🗓️ Aggiungi al calendario', googleCalendarUrl({
    name: tournament.name,
    startsAt: tournament.starts_at,
    endsAt: tournament.ends_at,
    locationName: tournament.location?.name,
    description: tournament.description
  }))
  range.row()

  range.text({ text: backLabel(origin), payload }, async (ctx) => {
    const buttonChatId = await requireChatId(ctx)
    if (!buttonChatId) return
    try {
      await navigateBack(ctx, () => resolveBackTarget(ctx, origin, buttonChatId))
      await ctx.answerCallbackQuery()
    } catch {
      await answerLoadError(ctx)
    }
  })
})

// Registered once here, unconditionally — torneoMenu is a singleton shared
// by four parents, not tied to any single register*Command's bot.use().
registerMenu('t', torneoMenu)

// Opens the detail view fresh from a list (calendario/leghe/iscrizioni's
// own submenu buttons call this); torneoMenu's own internal buttons stay
// on the same message and never need it.
export async function openTournamentDetail(ctx: Context, uuid: string, origin: string) {
  const chatId = await requireChatId(ctx)
  if (!chatId) return

  try {
    // Independent of each other — parallelized instead of two sequential awaits.
    const [tournament, associateUuid] = await Promise.all([
      cachedFetchTournament(ctx, uuid),
      cachedResolveAssociateUuid(ctx, chatId)
    ])
    if (!tournament) {
      await ctx.answerCallbackQuery({ text: 'Torneo non trovato', show_alert: true })
      return
    }

    const registration = associateUuid
      ? await cachedFetchRegistrationStatus(ctx, uuid, associateUuid)
      : null
    ctx.match = encodeTorneoPayload(uuid, origin)

    const blocks = tournamentDetailBlocks(tournament, registration)
    await ctx.editMessageText({ blocks }, { reply_markup: torneoMenu })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}
