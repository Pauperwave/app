// server\utils\telegram\commands\tessera.ts
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { requireLinkedAssociate } from './linking'
import type { Bot } from 'grammy'

interface AssociateStatusRow {
  first_name: string | null
  membership_status: string | null
  pauperwave_associate_number: string | null
  latest_renewal_date: string | null
  latest_renewal_year: number | null
}

const STATUS_LABEL: Record<string, string> = {
  active: '✅ Attivo',
  to_renew: '⚠️ Da rinnovare',
  expired: '❌ Scaduto',
  unpaid: '💶 Quota non pagata',
  pending: '⏳ Richiesta in attesa di approvazione',
  approved: '✅ Approvato',
  rejected: '❌ Richiesta rifiutata'
}

async function fetchAssociateStatus(associateUuid: string): Promise<AssociateStatusRow | null> {
  const supabase = telegramServiceSupabaseClient()

  // pauperwave_associates_with_status (not the base table) — it's the one
  // computing membership_status/latest_renewal_* from the renewals history,
  // same source the app's own /associates page reads (useAssociatesQuery.ts).
  const { data, error } = await supabase
    .from('pauperwave_associates_with_status')
    .select('first_name, membership_status, pauperwave_associate_number, latest_renewal_date, latest_renewal_year')
    .eq('uuid', associateUuid)
    .maybeSingle()

  if (error) throw error
  return data
}

function tesseraMessage(row: AssociateStatusRow): string {
  const status = row.membership_status ? STATUS_LABEL[row.membership_status] ?? row.membership_status : 'Sconosciuto'
  const lines = [`🪪 *Tesseramento di ${row.first_name ?? 'te'}*`, '', `Stato: ${status}`]

  if (row.pauperwave_associate_number) lines.push(`Numero socio: ${row.pauperwave_associate_number}`)
  if (row.latest_renewal_date) {
    const date = format(new Date(row.latest_renewal_date), 'd MMMM yyyy', { locale: it })
    const year = row.latest_renewal_year ? ` (anno ${row.latest_renewal_year})` : ''
    lines.push(`Ultimo rinnovo: ${date}${year}`)
  }

  return lines.join('\n')
}

export function registerTesseraCommand(bot: Bot) {
  bot.command('tessera', async (ctx) => {
    try {
      const associateUuid = await requireLinkedAssociate(ctx)
      if (!associateUuid) return

      const row = await fetchAssociateStatus(associateUuid)
      if (!row) {
        await ctx.reply('⚠️ Non trovo il tuo tesseramento, contatta un admin.')
        return
      }

      await ctx.reply(tesseraMessage(row), { parse_mode: 'Markdown' })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare il tuo tesseramento, riprova più tardi.')
    }
  })
}
