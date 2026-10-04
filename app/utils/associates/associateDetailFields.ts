// app\utils\associates\associateDetailFields.ts
import { format, parseISO } from 'date-fns'
import type { Associate } from '~/types'

export interface AssociateDetailField {
  icon: string
  label: string
  value: string
}

export interface AssociateConsentField {
  icon: string
  label: string
  value: boolean
}

export interface AssociateDetailFields {
  anagrafica: AssociateDetailField[]
  contatti: AssociateDetailField[]
  tesseramento: AssociateDetailField[]
  consensi: AssociateConsentField[]
}

const EMPTY = '—'

function formatDate(dateString?: string | null): string {
  if (!dateString) return ''
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy')
  } catch {
    return ''
  }
}

// The cards of /associate/[slug]: each field is an icon, a label and the associate's value, with a
// dash for what is not filled in
export function buildAssociateDetailFields(
  associate: Associate, t: (key: string) => string
): AssociateDetailFields {
  return {
    anagrafica: [
      { icon: ICONS.player, label: t('associate.columns.firstName'), value: associate.first_name },
      { icon: ICONS.player, label: t('associate.columns.lastName'), value: associate.last_name },
      { icon: ICONS.idCard, label: t('associate.columns.taxCode'), value: associate.tax_code || EMPTY },
      {
        icon: ICONS.cake,
        label: t('associate.columns.bornDate'),
        value: formatDate(associate.born_date) || EMPTY
      },
      {
        icon: ICONS.mapPin,
        label: t('associate.columns.bornLocation'),
        value: associate.born_location || EMPTY
      },
      {
        icon: ICONS.map,
        label: t('associate.columns.bornProvince'),
        value: associate.born_province || EMPTY
      },
      { icon: ICONS.flag, label: t('associate.columns.bornState'), value: associate.born_state || EMPTY }
    ],
    contatti: [
      { icon: ICONS.mail, label: t('associate.columns.emailAddress'), value: associate.email_address },
      // Same formatting as the table's phoneNumberColumn (formatPhoneNumber.ts): the raw column
      // stores E.164 ("+393203522674"), unreadable as-is
      {
        icon: ICONS.phone,
        label: t('associate.columns.phoneNumber'),
        value: formatPhoneNumber(associate.phone_number) || EMPTY
      },
      {
        icon: ICONS.mapPin,
        label: t('associate.columns.residencyAddress'),
        value: associate.residency_address
      },
      {
        icon: ICONS.hash,
        label: t('associate.columns.residencyHouseNumber'),
        value: associate.residency_house_number || EMPTY
      },
      { icon: ICONS.building, label: t('associate.columns.residencyCity'), value: associate.residency_city },
      {
        icon: ICONS.map,
        label: t('associate.columns.residencyProvince'),
        value: associate.residency_province
      },
      { icon: ICONS.mailbox, label: t('associate.columns.residencyCap'), value: associate.residency_cap }
    ],
    // pauperwave_associate_number/membership_status/associate_type don't go through this list: all
    // three render as their real badge component (AssociateNumberBadge/MembershipStatusBadge/
    // AssociateTypeBadge) in the card's #before slot, like the table
    tesseramento: [
      {
        icon: ICONS.calendar,
        label: t('associate.columns.requestDate'),
        value: formatDate(associate.request_date) || EMPTY
      },
      {
        icon: ICONS.calendarCheck,
        label: t('associate.columns.associationDate'),
        value: formatDate(associate.association_date) || EMPTY
      },
      {
        icon: ICONS.creditCard,
        label: t('associate.columns.lastRenewalDate'),
        value: formatDate(associate.latest_renewal_date) || EMPTY
      }
    ],
    // Booleans, not yes/no strings: rendered via <ConsentBadge>, the component also used by the
    // table's consent columns (useAssociatesTableColumns.ts)
    consensi: [
      {
        icon: ICONS.shieldCheck,
        label: t('associate.columns.consentData'),
        value: associate.consent_data
      },
      { icon: ICONS.share, label: t('associate.columns.consentSocial'), value: associate.consent_social },
      { icon: ICONS.rules, label: t('associate.columns.hasReadStatute'), value: associate.has_read_statute },
      {
        icon: ICONS.show,
        label: t('associate.columns.hasAcknowledgedSurveillanceNotice'),
        value: associate.has_acknowledged_surveillance_notice
      }
    ]
  }
}
