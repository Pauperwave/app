// app\composables\associates\useAssociatesStatusTabs.ts
import type { Ref } from 'vue'
import type { Associate } from '~/types'
import { columnFiltersForStatus, countMembershipStatuses } from '~/utils/associates/membershipStatusFilters'
import type { StatusColumnFilter } from '~/utils/associates/membershipStatusFilters'

// The status tabs above the roster table and the column filters they drive: `?status=` in the URL
// is the one source of truth for the tab, and the table's filters follow it
export function useAssociatesStatusTabs(
  rosterAssociates: Ref<Associate[]>,
  pendingRenewalUuids: Ref<Set<string> | undefined>
) {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()

  const columnFilters = ref<StatusColumnFilter[]>([])

  // Wires the sidebar links (/associates?status=pending|active|to_renew) to the membership_status
  // column filter.
  //
  // Replaces columnFilters.value wholesale instead of calling column.setFilterValue() on columns
  // from table.value?.tableApi (still done by requests.vue, which has no has_pending_renewal column
  // to race against): that mutates TanStack's internal state while UTable's v-model:column-filters
  // controls the same state declaratively. Switching status=pending_renewal -> status=active left
  // the table showing only the pending-renewal row: the second setFilterValue call (clearing
  // has_pending_renewal) lost the race against UTable's prop-watcher re-syncing from the
  // still-stale columnFilters ref. Assigning columnFilters.value makes it the one source of truth
  function applyMembershipStatusFilterFromQuery() {
    columnFilters.value = columnFiltersForStatus(route.query.status)
  }

  // No need to wait for UTable to mount: columnFilters is a plain ref owned by the page, not
  // something read off table.value?.tableApi
  onMounted(applyMembershipStatusFilterFromQuery)
  watch(() => route.query.status, applyMembershipStatusFilterFromQuery)

  // Real counts per membership status, for the tabs above the table (they replace the old static
  // sidebar links)
  const associatesStatusCounts = computed(() => countMembershipStatuses(rosterAssociates.value))

  // Rendered via the generic StatusFilterGroup (also used by wanted-cards), not UTabs: toggle
  // buttons filter the table below rather than switching views. `count` is optional per item
  // (StatusFilterGroup shows the nested UBadge only when set). Icons reused from
  // MEMBERSHIP_STATUS_BADGE_CONFIG (the single source for status icons, like transactions'
  // typeTabs), icon-only below `lg` via StatusFilterGroup's icon prop
  const statusTabs = computed(() => [
    { label: t('associate.tabs.all'), value: 'all' as const, count: undefined },
    {
      label: t('associate.tabs.active'),
      value: 'active' as const,
      count: associatesStatusCounts.value.active,
      icon: MEMBERSHIP_STATUS_BADGE_CONFIG.active.icon
    },
    {
      label: t('associate.tabs.pendingRenewal'),
      value: 'pending_renewal' as const,
      count: pendingRenewalUuids.value?.size,
      icon: ICONS.calendarRenew
    },
    {
      label: t('associate.tabs.toRenew'),
      value: 'to_renew' as const,
      count: associatesStatusCounts.value.to_renew,
      icon: MEMBERSHIP_STATUS_BADGE_CONFIG.to_renew.icon
    },
    {
      label: t('associate.tabs.expired'),
      value: 'expired' as const,
      count: associatesStatusCounts.value.expired,
      icon: MEMBERSHIP_STATUS_BADGE_CONFIG.expired.icon
    }
  ])

  const activeStatusTab = computed({
    get: () => (typeof route.query.status === 'string' ? route.query.status : 'all'),
    set: (value: string | number) => {
      router.replace({ query: { ...route.query, status: value === 'all' ? undefined : value } })
    }
  })

  return { columnFilters, statusTabs, activeStatusTab }
}
