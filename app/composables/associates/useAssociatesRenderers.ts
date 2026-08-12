// app\composables\associates\useAssociatesRenderers.ts
import { format, parseISO } from 'date-fns'
import { UBadge } from '#components'
import type { BadgeProps } from '@nuxt/ui'
import type { Associate } from '~/types'

// Shared table-cell rendering between associates/index.vue (roster) and
// associates/requests.vue (pending/rejected queue) — extracted 2026-08-11
// when the two pages split, so formatting/badge logic can't drift between
// them. A composable, not a plain util: renderAssociateTypeBadge/
// renderConsentBadge both need t() for their labels.
export function useAssociatesRenderers() {
  const { t } = useI18n()

  function formatDateTime(isoString?: string): string {
    if (!isoString) return ''
    try {
      return format(parseISO(isoString), 'dd/MM/yyyy HH:mm')
    } catch {
      return ''
    }
  }

  function formatDate(dateString?: string | null): string {
    if (!dateString) return ''
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy')
    } catch {
      return ''
    }
  }

  function renderAssociateTypeBadge(type: Associate['associate_type']) {
    // No fallback for null: every associate should have a type in the DB (fixed
    // via migration 2026-08-10, backfilling the pre-existing nulls) — a blank
    // cell here would mean the data went inconsistent again, and should stay
    // visible as that rather than being masked behind a default.
    if (!type) return null

    const typeConfig: Record<NonNullable<Associate['associate_type']>, { color: BadgeProps['color'], icon: string }> = {
      regular: { color: 'neutral', icon: ICONS.player },
      sustaining: { color: 'primary', icon: 'i-lucide-star' }
    }
    const { color, icon } = typeConfig[type]

    return h(UBadge, {
      class: 'gap-2',
      variant: 'subtle',
      icon,
      color,
      label: t(`associate.types.${type}`)
    })
  }

  function renderConsentBadge(consentvalue: boolean) {
    const consentConfig: Record<string, { label: string, color: BadgeProps['color'], icon: string }> = {
      yes: { label: t('common.yes'), color: 'success', icon: ICONS.success },
      no: { label: t('common.no'), color: 'error', icon: ICONS.clear }
    }

    return h(UBadge, {
      variant: 'subtle',
      class: 'w-[60px]',
      ...consentConfig[consentvalue ? 'yes' : 'no']
    })
  }

  return { formatDateTime, formatDate, renderAssociateTypeBadge, renderConsentBadge }
}
