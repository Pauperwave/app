// server\utils\telegram\commands\tournament\detail.ts

// A single tournament's detail view (message + registration actions),
// shared by calendario.ts, leghe.ts, iscrizioni.ts and prossimo.ts — split
// out of calendario.ts (2026-09-03) once it grew too large.
//
// torneoMenu's back button rebuilds the exact origin view (month/league/
// list) instead of using Menu's built-in back()/nav(), which can't hand the
// target menu a fresh payload — every button therefore carries
// `${uuid}:${origin}` so both survive a full round trip.
import type { Context } from 'grammy'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { formatTournamentDateTime, tournamentHeader } from './line'
import { fetchRegistrationStatus, fetchStageNumbers } from './queries'
import type { RegistrationStatus } from './queries'
import { NOT_LINKED_MESSAGE } from '../linking'
import { answerLoadError } from '../callbackErrors'
import { mapsUrl, googleCalendarUrl, truncateForCaption } from '../eventLinks'
import { navigateBack, getMenu } from '../../menuNav'
// Circular import (calendario/leghe/iscrizioni import torneoMenu, this
// imports their text-renderers back) — safe since only used inside async
// handlers. Menu objects themselves come via menuNav.ts's registry instead.
import { calendarioText } from '../calendario'
import { legaTorneiText } from '../leghe'
import { iscrizioniText } from '../iscrizioni'
import { prossimoText } from '../prossimo'

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

function tournamentDetailMessage(
  row: DatedTournamentRow, registration: RegistrationStatus
): FormattedString {
  const date = formatTournamentDateTime(row.starts_at)
  const endTime = row.ends_at ? ` – ${formatTelegramDate(row.ends_at, 'HH:mm')}` : ''
  const lines: (FormattedString | string)[] = [
    tournamentHeader(row.status, row.name, row.stageNumber),
    '',
    `🗓️ ${date}${endTime}`
  ]

  if (row.location?.name) {
    const url = mapsUrl(row.location)
    lines.push(url ? fmt`📍 ${FormattedString.link(row.location.name, url)}` : `📍 ${row.location.name}`)
  }
  if (row.organizer?.name) lines.push(`🏳️ Organizzatore: ${row.organizer.name}`)
  if (row.contact_name) {
    const phone = row.contact_phone ? ` (${row.contact_phone})` : ''
    lines.push(`☎️ Referente: ${row.contact_name}${phone}`)
  }
  if (row.entry_fee !== null) lines.push(`💶 Quota: ${row.entry_fee} €`)
  if (row.prizes) lines.push(`🏆 Premi: ${row.prizes}`)
  if (registration === 'registered') lines.push('', '✅ Sei iscritto a questo torneo.')
  if (registration === 'checked_in') lines.push('', '✅ Sei iscritto e hai già fatto il check-in.')
  if (row.description) lines.push('', row.description)

  return FormattedString.join(lines, '\n')
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
  origin: string, chatId: number
): Promise<{ payload: string, menu: Menu<Context>, text: FormattedString }> {
  if (origin.startsWith('l')) {
    const index = Number(origin.slice(1))
    const text = await legaTorneiText(index, chatId) ?? new FormattedString('🏆 Lega non trovata.')
    return { payload: String(index), menu: getMenu('lt'), text }
  }
  if (origin === 'i') {
    return { payload: '', menu: getMenu('isc'), text: await iscrizioniText(chatId) }
  }
  if (origin === 'p') {
    return { payload: '', menu: getMenu('p'), text: await prossimoText() }
  }
  const offset = Number(origin.slice(1))
  return { payload: String(offset), menu: getMenu('cal'), text: await calendarioText(offset, chatId) }
}

async function resolveLinkedAssociate(
  ctx: Context, chatId: number, notLinkedMessage: string
): Promise<string | null> {
  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) {
    await ctx.answerCallbackQuery({ text: notLinkedMessage, show_alert: true })
    return null
  }
  return associateUuid
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

  const tournament = await fetchTournament(uuid)
  if (!tournament) return

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  const registration = associateUuid ? await fetchRegistrationStatus(uuid, associateUuid) : null
  const payload = encodeTorneoPayload(uuid, origin)

  if (!isExternalOrganizer(tournament)) {
    if (registration === 'checked_in') {
      range.text({ text: '🎯 Check-in effettuato', payload }, async (ctx) => {
        await ctx.answerCallbackQuery({
          text: 'Hai già fatto il check-in per questo torneo, non puoi più annullare l\'iscrizione da qui.',
          show_alert: true
        })
      })
    } else if (registration === 'registered') {
      range.text({ text: '❌ Annulla iscrizione', payload }, async (ctx) => {
        const buttonChatId = ctx.chat?.id
        if (!buttonChatId) {
          await ctx.answerCallbackQuery().catch(() => {})
          return
        }
        try {
          const linkedAssociateUuid = await resolveLinkedAssociate(ctx, buttonChatId, 'Nessun account collegato.')
          if (!linkedAssociateUuid) return

          const supabase = telegramServiceSupabaseClient()
          const { data: existing, error: findError } = await supabase
            .from('tournament_registrations')
            .select('uuid, status, players!inner(associate_uuid)')
            .eq('tournament_uuid', uuid)
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
      })
    } else if (tournament.status === 'registration_open') {
      range.text({ text: '➕ Iscriviti', payload }, async (ctx) => {
        const buttonChatId = ctx.chat?.id
        if (!buttonChatId) {
          await ctx.answerCallbackQuery().catch(() => {})
          return
        }
        try {
          const linkedAssociateUuid = await resolveLinkedAssociate(
            ctx, buttonChatId, NOT_LINKED_MESSAGE
          )
          if (!linkedAssociateUuid) return

          const supabase = telegramServiceSupabaseClient()
          const { error } = await supabase.rpc('register_tournament_players', {
            p_tournament_uuid: uuid,
            p_associate_uuids: [linkedAssociateUuid]
          })
          if (error) throw error

          ctx.menu.update()
          await ctx.answerCallbackQuery({ text: '✅ Iscrizione confermata!' })
        } catch {
          await ctx.answerCallbackQuery({ text: 'Errore durante l\'iscrizione, riprova più tardi.', show_alert: true })
        }
      })
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
    const buttonChatId = ctx.chat?.id
    if (!buttonChatId) {
      await ctx.answerCallbackQuery().catch(() => {})
      return
    }
    try {
      await navigateBack(ctx, () => resolveBackTarget(origin, buttonChatId))
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
  const chatId = ctx.chat?.id
  if (!chatId) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  try {
    const tournament = await fetchTournament(uuid)
    if (!tournament) {
      await ctx.answerCallbackQuery({ text: 'Torneo non trovato', show_alert: true })
      return
    }

    const associateUuid = await resolveAssociateUuidByChatId(chatId)
    const registration = associateUuid ? await fetchRegistrationStatus(uuid, associateUuid) : null
    const text = tournamentDetailMessage(tournament, registration)
    ctx.match = encodeTorneoPayload(uuid, origin)

    if (tournament.image_url) {
      // Can't turn an existing text message into a photo one via
      // editMessageText — replace it instead.
      await ctx.deleteMessage().catch(() => {})
      const capped = truncateForCaption(text)
      await ctx.replyWithPhoto(tournament.image_url, {
        caption: capped.caption,
        caption_entities: capped.caption_entities,
        reply_markup: torneoMenu
      })
    } else {
      await ctx.editMessageText(text.text, {
        entities: text.entities,
        reply_markup: torneoMenu,
        link_preview_options: { is_disabled: true }
      })
    }
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}
