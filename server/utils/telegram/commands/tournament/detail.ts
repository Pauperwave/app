// server\utils\telegram\commands\tournament\detail.ts

// A single tournament's detail view (message + registration actions) —
// split out of calendario.ts (2026-09-03) because it isn't actually
// calendario-specific: it's reachable from calendario.ts's own month grid,
// leghe.ts's per-league tournament list, and iscrizioni.ts's "my
// tournaments" list alike (see backTarget's comment below), and had grown
// calendario.ts past 480 lines on its own.
//
// @grammyjs/menu migration (2026-09-06, user request): torneoMenu is a
// single shared Menu reachable from three different parents. Every button
// on it carries `${uuid}:${origin}` as its payload — the plugin re-derives
// ctx.match from whichever button was pressed, and torneoMenu's own
// .dynamic() needs both pieces every time it renders (the tournament to
// show, and where "back" should return to), so every button must carry the
// full pair, not just its own half.
//
// The "back" button deliberately does NOT use Menu's built-in
// .back()/ctx.menu.nav() — nav() has no way to hand the target menu a fresh
// payload, so a plain nav() would land you back on /calendario's own menu
// with no memory of which month you were browsing (same for a league's
// tournament list). Instead, the back button is a plain .text() button that
// manually: resolves which origin menu + payload to return to, fetches that
// view's own text (calendarioText/legaTorneiText/iscrizioniText, imported
// from their own command files — see the cycle note below), overwrites
// ctx.match with the target's own payload format, and edits the message
// itself with that origin menu as reply_markup. This is the fragile,
// hand-rolled plumbing flagged before starting this refactor — it exists
// because full "return to the exact page you came from" fidelity was an
// explicit user request over the simpler "always reopen a fresh root view"
// alternative.
import { Menu } from '@grammyjs/menu'
import { format } from 'date-fns'
import { FormattedString } from '@grammyjs/parse-mode'
import { formatTournamentDateTime, tournamentHeader } from './line'
import { fetchRegistrationStatus, fetchStageNumbers } from './queries'
import { NOT_LINKED_MESSAGE } from '../linking'
import { answerLoadError } from '../callbackErrors'
import { navigateBack, getMenu } from '../../menuNav'
// Circular at the module level (calendario.ts/leghe.ts/iscrizioni.ts import
// torneoMenu from here, this imports their own text-renderers back) — safe
// because every one of these bindings is only ever called from inside an
// async handler, never read at module-evaluation time. The target *menu*
// objects themselves (as opposed to these text functions) come through
// menuNav.ts's registry instead of a direct import — see its own comment.
import { calendarioText } from '../calendario'
import { legaTorneiText } from '../leghe'
import { iscrizioniText } from '../iscrizioni'
import type { Context } from 'grammy'
import type { RegistrationStatus } from './queries'

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

function tournamentDetailMessage(
  row: DatedTournamentRow, registration: RegistrationStatus
): FormattedString {
  const date = formatTournamentDateTime(row.starts_at)
  const endTime = row.ends_at ? ` – ${format(new Date(row.ends_at), 'HH:mm')}` : ''
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

// Telegram photo captions cap at 1024 characters (vs. 4096 for plain text
// messages) — only relevant when the detail is sent as a photo (image_url
// set), so this trims the description first rather than the fixed fields
// above it. .slice() (not a raw string cut) keeps the entities themselves
// consistent with the truncated text.
const CAPTION_LIMIT = 1024

function truncateForCaption(text: FormattedString): FormattedString {
  if (text.text.length <= CAPTION_LIMIT) return text
  return text.slice(0, CAPTION_LIMIT - 1).plain('…')
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

// Shop organizers (Magman etc.) show up in the bot for schedule visibility
// (user request, 2026-09-04) but registration is their own business, not
// Pauperwave's — the Iscriviti/Annulla/check-in flow only ever manages
// tournament_registrations for the club's own tournaments.
function isExternalOrganizer(row: DatedTournamentRow): boolean {
  return row.organizer?.type === 'shop'
}

// Payload format shared by every button on torneoMenu: `${uuid}:${origin}`.
// `origin` is the same compact token as before the menu migration
// (`m<monthOffset>`, `l<leagueIndex>`, or `i` for iscrizioni — which used to
// share calendario's own 'm0' as a placeholder back-target, now that
// iscrizioni has a real menu of its own to return to).
function encodeTorneoPayload(uuid: string, origin: string): string {
  return `${uuid}:${origin}`
}

function decodeTorneoPayload(raw: string): { uuid: string, origin: string } {
  const separator = raw.indexOf(':')
  return { uuid: raw.slice(0, separator), origin: raw.slice(separator + 1) }
}

// Cheap, sync — used on every torneoMenu render to label the back button,
// without the cost of actually rebuilding the origin view (only done when
// the button is pressed, see resolveBackTarget below).
function backLabel(origin: string): string {
  if (origin.startsWith('l')) return '« Torna alla lega'
  if (origin === 'i') return '« Torna ai tuoi tornei'
  return '« Torna al mese'
}

// The expensive half of going back — rebuilds the exact origin view (same
// month / same league / the iscrizioni list) so the back button restores
// precisely where the user came from, not a fresh default view. The target
// Menu instance itself comes from menuNav.ts's registry (getMenu), not a
// direct import of calendario.ts's/leghe.ts's own Menu object — see that
// file's comment for why.
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
  const offset = Number(origin.slice(1))
  return { payload: String(offset), menu: getMenu('cal'), text: await calendarioText(offset, chatId) }
}

async function resolveLinkedAssociate(
  ctx: Context, notLinkedMessage: string
): Promise<string | null> {
  const associateUuid = await resolveAssociateUuidByChatId(ctx.chat!.id)
  if (!associateUuid) {
    await ctx.answerCallbackQuery({ text: notLinkedMessage, show_alert: true })
    return null
  }
  return associateUuid
}

// autoAnswer: false — every button below answers with its own confirmation/
// error text, which would race with Menu's default no-args auto-answer.
export const torneoMenu = new Menu<Context>('t', { autoAnswer: false }).dynamic(async (ctx, range) => {
  const raw = ctx.match as string | undefined
  if (!raw) return
  const { uuid, origin } = decodeTorneoPayload(raw)

  const tournament = await fetchTournament(uuid)
  if (!tournament) return

  const associateUuid = await resolveAssociateUuidByChatId(ctx.chat!.id)
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
        try {
          const linkedAssociateUuid = await resolveLinkedAssociate(ctx, 'Nessun account collegato.')
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
        try {
          const linkedAssociateUuid = await resolveLinkedAssociate(ctx, NOT_LINKED_MESSAGE)
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
  range.url('🗓️ Aggiungi al calendario', googleCalendarUrl(tournament))
  range.row()

  range.text({ text: backLabel(origin), payload }, async (ctx) => {
    try {
      await navigateBack(ctx, () => resolveBackTarget(origin, ctx.chat!.id))
      await ctx.answerCallbackQuery()
    } catch {
      await answerLoadError(ctx)
    }
  })
})

// Registered here (not by whichever register*Command calls bot.use() on
// this menu) since torneoMenu is a module-level singleton reachable from
// three different parents — one registration site, unconditional.
registerMenu('t', torneoMenu)

// Opens the detail view fresh from a list (calendario/leghe/iscrizioni's own
// submenu button middleware calls this) — as opposed to torneoMenu's own
// internal buttons, which stay on the same message and never need this.
export async function openTournamentDetail(ctx: Context, uuid: string, origin: string) {
  try {
    const tournament = await fetchTournament(uuid)
    if (!tournament) {
      await ctx.answerCallbackQuery({ text: 'Torneo non trovato', show_alert: true })
      return
    }

    const associateUuid = await resolveAssociateUuidByChatId(ctx.chat!.id)
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
