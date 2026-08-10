<!-- app\pages\(community)\associates\index.vue -->
<script setup lang="ts">
import type { DropdownMenuItem, TableColumn, TabsItem } from '@nuxt/ui'
import type { Column } from '@tanstack/vue-table'
import { upperFirst } from 'scule'
import type { Associate } from '~/types'
import { format, parseISO } from 'date-fns'

const { associates, loading, refresh } = useAssociates()
const { geocodes, loading: geocodesLoading } = useAssociateGeocodes()
const { t } = useI18n()

const viewMode = ref<'table' | 'map'>('table')
const viewModeItems = computed<TabsItem[]>(() => [
  { label: t('associate.views.table'), value: 'table', icon: 'i-lucide-table' },
  { label: t('associate.views.map'), value: 'map', icon: 'i-lucide-map' }
])

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')

const route = useRoute()
const router = useRouter()
const { isModalOpen } = useModalOpenFromQuery()

function formatDateTime(isoString?: string): string {
  if (!isoString) return ''
  try {
    const date = parseISO(isoString)
    return format(date, 'dd/MM/yyyy HH:mm')
  } catch {
    return ''
  }
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return ''
  try {
    const date = parseISO(dateString)
    return format(date, 'dd/MM/yyyy')
  } catch {
    return ''
  }
}

const table = useTemplateRef('table')

// Wires the sidebar links (/associates?status=pending|active|to_renew) to the
// membership_status column filter, which can only be applied after UTable mounts.
function applyMembershipStatusFilterFromQuery() {
  const statusColumn = table.value?.tableApi?.getColumn('membership_status')
  if (!statusColumn) return
  const status = route.query.status
  statusColumn.setFilterValue(typeof status === 'string' ? status : undefined)
}

onMounted(() => nextTick(applyMembershipStatusFilterFromQuery))
watch(() => route.query.status, applyMembershipStatusFilterFromQuery)

// Real counts per membership status, for the tabs above the table (they replace the
// old static sidebar links).
const associatesStatusCounts = computed(() => {
  const counts = { pending: 0, active: 0, to_renew: 0 }
  for (const associate of associates.value) {
    if (associate.membership_status in counts) {
      counts[associate.membership_status as keyof typeof counts]++
    }
  }
  return counts
})

// Rendered via the generic StatusFilterGroup (also used by wanted-cards), not
// UTabs: toggle buttons filter the table below rather than switching between
// separate views. `count` is optional per item — StatusFilterGroup only shows
// the nested UBadge when it's set.
const statusTabs = computed(() => [
  { label: t('associate.tabs.all'), value: 'all' as const, count: undefined },
  { label: t('associate.tabs.pending'), value: 'pending' as const, count: associatesStatusCounts.value.pending },
  { label: t('associate.tabs.active'), value: 'active' as const, count: associatesStatusCounts.value.active },
  { label: t('associate.tabs.toRenew'), value: 'to_renew' as const, count: associatesStatusCounts.value.to_renew }
])

const activeStatusTab = computed({
  get: () => (typeof route.query.status === 'string' ? route.query.status : 'all'),
  set: (value: string | number) => {
    router.replace({ query: { ...route.query, status: value === 'all' ? undefined : value } })
  }
})

const columnFilters = ref([])

const columnHeaders = {
  select: t('associate.columns.select'),
  id: t('associate.columns.id'),
  uuid: t('associate.columns.uuid'),
  created_at: t('associate.columns.createdAt'),
  updated_at: t('associate.columns.updatedAt'),
  updated_by: t('associate.columns.updatedBy'),
  membership_request_status: t('associate.columns.membershipRequestStatus'),
  membership_status: t('associate.columns.membershipStatus'),
  request_date: t('associate.columns.requestDate'),
  payment_date: t('associate.columns.paymentDate'),
  association_date: t('associate.columns.associationDate'),
  associate_type: t('associate.columns.associateType'),
  pauperwave_associate_number: t('associate.columns.pauperwaveAssociateNumber'),
  consent_data: t('associate.columns.consentData'),
  consent_social: t('associate.columns.consentSocial'),
  has_read_statute: t('associate.columns.hasReadStatute'),
  has_acknowledged_surveillance_notice: t('associate.columns.hasAcknowledgedSurveillanceNotice'),
  first_name: t('associate.columns.firstName'),
  last_name: t('associate.columns.lastName'),
  email_address: t('associate.columns.emailAddress'),
  phone_number: t('associate.columns.phoneNumber'),
  tax_code: t('associate.columns.taxCode'),
  born_date: t('associate.columns.bornDate'),
  born_location: t('associate.columns.bornLocation'),
  born_province: t('associate.columns.bornProvince'),
  born_state: t('associate.columns.bornState'),
  residency_address: t('associate.columns.residencyAddress'),
  residency_house_number: t('associate.columns.residencyHouseNumber'),
  residency_city: t('associate.columns.residencyCity'),
  residency_province: t('associate.columns.residencyProvince'),
  residency_cap: t('associate.columns.residencyCap'),
  mtgo_nickname: t('associate.columns.mtgoNickname'),
  mtga_nickname: t('associate.columns.mtgaNickname')
} as const

// Define a type for the keys of columnHeaders
type ColumnHeaderKey = keyof typeof columnHeaders

// Helper to get column label with fallback
function getColumnLabel(id: string): string {
  if (id in columnHeaders) {
    return columnHeaders[id as ColumnHeaderKey]
  }
  return id
}

const visibilityItems = computed(() => getVisibilityItems())

// Generate visibility items based on columns that can be hidden
const getVisibilityItems = (): DropdownMenuItem[] => {
  const allColumns = table.value?.tableApi?.getAllColumns()
  if (!allColumns) return []

  return allColumns
    .filter((column: Column<Associate>) => column.getCanHide())
    .map(createVisibilityItem)
}

// Helper to create visibility toggle items
function createVisibilityItem(column: Column<Associate>): DropdownMenuItem {
  return {
    label: getColumnLabel(column.id),
    type: 'checkbox' as const,
    checked: column.getIsVisible(),
    onUpdateChecked(checked: boolean) {
      table.value?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
    },
    onSelect(e: Event) {
      e.preventDefault()
    }
  }
}

const columnVisibility = ref({
  uuid: false,
  created_at: false,
  updated_at: false,
  updated_by: false,
  association_date: false,
  associate_type: false,
  consent_data: false,
  has_read_statute: false,
  has_acknowledged_surveillance_notice: false,
  born_location: false,
  born_province: false,
  born_state: false,
  residency_address: false,
  residency_house_number: false,
  residency_city: false,
  residency_province: false,
  residency_cap: false,
  mtgo_nickname: false,
  mtga_nickname: false
})

const rowSelection = ref({})

const columns: TableColumn<Associate>[] = [
  {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) =>
      h(UCheckbox, {
        'modelValue': table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'aria-label': t('common.selectAll')
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'aria-label': t('common.selectRow')
      })
  },
  {
    accessorKey: 'id',
    header: ({ column }) => sortableHeader(columnHeaders.id, column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.id
  },
  {
    accessorKey: 'uuid',
    header: columnHeaders.uuid,
    cell: ({ row }) => renderNeutralBadge(row.original.uuid)
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => sortableHeader(columnHeaders.created_at, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatDateTime(row.original.created_at)
  },
  {
    accessorKey: 'updated_at',
    header: ({ column }) => sortableHeader(columnHeaders.updated_at, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatDateTime(row.original.updated_at)
  },
  {
    accessorKey: 'updated_by',
    header: columnHeaders.updated_by,
    cell: ({ row }) => row.original.updated_by
  },
  {
    accessorKey: 'membership_request_status',
    header: ({ column }) => sortableHeader(columnHeaders.membership_request_status, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => {
      const status = row.getValue('membership_request_status') as string
      const statusConfig: Record<string, { color: string, icon: string }> = {
        approved: { color: 'success', icon: ICONS.success },
        pending: { color: 'warning', icon: ICONS.pending },
        rejected: { color: 'error', icon: ICONS.statusRejected }
      }
      const { color, icon } = statusConfig[status] || { color: 'neutral', icon: ICONS.help }

      return h(resolveComponent('UBadge'), {
        class: 'capitalize cursor-pointer hover:opacity-80 transition-opacity gap-2',
        variant: 'subtle',
        icon,
        color,
        label: upperFirst(status),
        onClick: (e: Event) => {
          e.stopPropagation() // Prevent row click if you add onSelect later
          const statusColumn = table?.value?.tableApi?.getColumn('membership_request_status')
          if (statusColumn) {
            statusColumn.setFilterValue(status)
          }
        }
      })
    }
  },
  {
    accessorKey: 'membership_status',
    header: ({ column }) => sortableHeader(columnHeaders.membership_status, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => {
      const status = row.getValue('membership_status') as string
      const statusConfig: Record<string, { color: string, icon: string }> = {
        active: { color: 'success', icon: ICONS.success },
        to_renew: { color: 'warning', icon: ICONS.refresh },
        expired: { color: 'error', icon: ICONS.banned },
        pending: { color: 'warning', icon: ICONS.pending },
        rejected: { color: 'error', icon: ICONS.statusRejected }
      }
      const { color, icon } = statusConfig[status] || { color: 'neutral', icon: ICONS.help }

      return h(resolveComponent('UBadge'), {
        class: 'capitalize gap-2',
        variant: 'subtle',
        icon,
        color,
        label: upperFirst(status.replace('_', ' '))
      })
    }
  },
  {
    accessorKey: 'request_date',
    header: ({ column }) => sortableHeader(columnHeaders.request_date, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatDateTime(row.original.request_date)
  },
  {
    accessorKey: 'payment_date',
    header: ({ column }) => sortableHeader(columnHeaders.payment_date, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatDate(row.original.payment_date)
  },
  {
    accessorKey: 'association_date',
    header: ({ column }) => sortableHeader(columnHeaders.association_date, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatDate(row.original.association_date)
  },
  {
    accessorKey: 'associate_type',
    header: ({ column }) => sortableHeader(columnHeaders.associate_type, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderAssociateTypeBadge(row.original.associate_type)
  },
  {
    accessorKey: 'pauperwave_associate_number',
    header: ({ column }) => sortableHeader(columnHeaders.pauperwave_associate_number, column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.pauperwave_associate_number || ''
  },
  {
    accessorKey: 'consent_data',
    header: ({ column }) => sortableHeader(columnHeaders.consent_data, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderConsentBadge(row.original.consent_data)
  },
  {
    accessorKey: 'consent_social',
    header: ({ column }) => sortableHeader(columnHeaders.consent_social, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderConsentBadge(row.original.consent_social)
  },
  {
    accessorKey: 'has_read_statute',
    header: ({ column }) => sortableHeader(columnHeaders.has_read_statute, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderConsentBadge(row.original.has_read_statute)
  },
  {
    accessorKey: 'has_acknowledged_surveillance_notice',
    header: ({ column }) =>
      sortableHeader(columnHeaders.has_acknowledged_surveillance_notice, column),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => renderConsentBadge(row.original.has_acknowledged_surveillance_notice)
  },
  {
    accessorKey: 'first_name',
    header: ({ column }) => sortableHeader(columnHeaders.first_name, column),
    cell: ({ row }) => row.original.first_name
  },
  {
    accessorKey: 'last_name',
    header: ({ column }) => sortableHeader(columnHeaders.last_name, column),
    cell: ({ row }) => row.original.last_name
  },
  {
    accessorKey: 'email_address',
    header: columnHeaders.email_address,
    cell: ({ row }) => row.original.email_address
  },
  {
    accessorKey: 'phone_number',
    header: columnHeaders.phone_number,
    meta: { class: { td: 'font-mono' } },
    cell: ({ row }) => row.original.phone_number
  },
  {
    accessorKey: 'tax_code',
    header: columnHeaders.tax_code,
    meta: { class: { td: 'font-mono' } },
    cell: ({ row }) => row.original.tax_code
  },
  {
    accessorKey: 'born_date',
    header: ({ column }) => sortableHeader(columnHeaders.born_date, column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
    cell: ({ row }) => formatDate(row.original.born_date)
  },
  {
    accessorKey: 'born_location',
    header: ({ column }) => sortableHeader(columnHeaders.born_location, column),
    cell: ({ row }) => row.original.born_location || ''
  },
  {
    accessorKey: 'born_province',
    header: columnHeaders.born_province,
    meta: { class: { td: 'font-mono' } },
    cell: ({ row }) => row.original.born_province || ''
  },
  {
    accessorKey: 'born_state',
    header: columnHeaders.born_state,
    cell: ({ row }) => row.original.born_state || ''
  },
  {
    accessorKey: 'residency_address',
    header: columnHeaders.residency_address,
    cell: ({ row }) => row.original.residency_address
  },
  {
    accessorKey: 'residency_house_number',
    header: columnHeaders.residency_house_number,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => row.original.residency_house_number || ''
  },
  {
    accessorKey: 'residency_city',
    header: ({ column }) => sortableHeader(columnHeaders.residency_city, column),
    cell: ({ row }) => row.original.residency_city
  },
  {
    accessorKey: 'residency_province',
    header: columnHeaders.residency_province,
    meta: { class: { td: 'font-mono' } },
    cell: ({ row }) => row.original.residency_province
  },
  {
    accessorKey: 'residency_cap',
    header: columnHeaders.residency_cap,
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => row.original.residency_cap
  },
  {
    accessorKey: 'mtgo_nickname',
    header: columnHeaders.mtgo_nickname,
    cell: ({ row }) => row.original.mtgo_nickname
  },
  {
    accessorKey: 'mtga_nickname',
    header: columnHeaders.mtga_nickname,
    cell: ({ row }) => row.original.mtga_nickname
  }
]

function renderNeutralBadge(value: string) {
  return h(resolveComponent('UBadge'), {
    variant: 'subtle',
    color: 'neutral',
    class: 'font-mono',
    label: String(value)
  })
}

function renderAssociateTypeBadge(type: Associate['associate_type']) {
  // No fallback for null: every associate should have a type in the DB (fixed via
  // migration 2026-08-10, backfilling the pre-existing nulls to 'ordinario') — a
  // blank cell here would mean the data went inconsistent again, and should stay
  // visible as that rather than being masked behind a default.
  if (!type) return null

  const typeConfig: Record<NonNullable<Associate['associate_type']>, { color: string, icon: string }> = {
    ordinario: { color: 'neutral', icon: ICONS.player },
    sostenitore: { color: 'primary', icon: 'i-lucide-star' }
  }
  const { color, icon } = typeConfig[type]

  return h(resolveComponent('UBadge'), {
    class: 'capitalize gap-2',
    variant: 'subtle',
    icon,
    color,
    label: upperFirst(type)
  })
}

function renderConsentBadge(consentvalue: boolean) {
  const consent = consentvalue
  const consentConfig: Record<string, { label: string, color: string, icon: string }> = {
    yes: { label: t('common.yes'), color: 'success', icon: ICONS.success },
    no: { label: t('common.no'), color: 'error', icon: ICONS.clear }
  }

  return h(resolveComponent('UBadge'), {
    variant: 'subtle',
    class: 'w-[60px]',
    ...consentConfig[consent ? 'yes' : 'no']
  })
}

const consentSocialOptions = [
  { label: t('associate.consentSocialOptions.all'), value: 'all', icon: 'i-lucide-megaphone', color: 'neutral' },
  { label: t('associate.consentSocialOptions.yes'), value: 'yes', icon: ICONS.success, color: 'success' },
  { label: t('associate.consentSocialOptions.no'), value: 'no', icon: ICONS.clear, color: 'error' }
]

const consentSocialFilter = ref('all')

watch(() => consentSocialFilter.value, (newVal) => {
  if (!table?.value?.tableApi) return

  const consentColumn = table.value.tableApi.getColumn('consent_social')
  if (!consentColumn) return

  consentColumn.setFilterValue(newVal === 'all' ? undefined : newVal === 'yes')
})
</script>

<template>
  <UDashboardPanel id="associates">
    <template #header>
      <UDashboardNavbar :title="$t('associate.breadcrumb')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
          <AssociatesListAddModal v-model="isModalOpen" />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <!-- Status filter, search/social/columns filters and row-actions all in one
           toolbar row — same #left/#right split as wanted-cards' UDashboardToolbar.
           Status is a UFieldGroup of toggle UButtons, not UTabs: this filters the
           table below rather than switching between separate views. -->
      <UDashboardToolbar
        v-if="viewMode === 'table'"
        :ui="{ root: 'flex-wrap h-auto py-2 gap-1.5', left: 'gap-4 flex-wrap' }"
      >
        <template #left>
          <StatusFilterGroup v-model="activeStatusTab" :items="statusTabs" />

          <UInput
            :model-value="(
              table?.tableApi?.getColumn('email_address')?.getFilterValue() as string
            )"
            class="max-w-sm"
            :icon="ICONS.search"
            :placeholder="$t('common.filterEmailsPlaceholder')"
            @update:model-value="
              table?.tableApi?.getColumn('email_address')?.setFilterValue($event)
            "
          />

          <UTooltip :text="$t('associate.consentSocialLabel')">
            <UStatusSelect
              v-model="consentSocialFilter"
              :items="consentSocialOptions"
              name="consentSocialFilter"
            />
          </UTooltip>
        </template>

        <template #right>
          <AssociatesListApproveModal
            v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            :ids="table.tableApi.getFilteredSelectedRowModel().rows.map(row => row.original.id)"
            @approved="refresh"
          >
            <UButton
              :label="$t('associate.approveModal.approve')"
              color="success"
              variant="subtle"
              :icon="ICONS.confirm"
            >
              <template #trailing>
                <UKbd>
                  {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}
                </UKbd>
              </template>
            </UButton>
          </AssociatesListApproveModal>

          <UDropdownMenu :items="visibilityItems" :content="{ align: 'end' }">
            <UButton
              :label="$t('common.showColumns')"
              color="neutral"
              variant="outline"
              :trailing-icon="ICONS.settingsColumns"
            />
          </UDropdownMenu>

          <UButton
            :icon="ICONS.refresh"
            color="neutral"
            variant="outline"
            :loading="loading"
            @click="refresh"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <template v-if="viewMode === 'table'">
        <UTable
          ref="table"
          v-model:column-filters="columnFilters"
          v-model:column-visibility="columnVisibility"
          v-model:row-selection="rowSelection"
          :virtualize="{
            estimateSize: 35,
            overscan: 12
          }"
          :data="associates"
          :columns="columns"
          class="flex-1 h-80 shrink-0"
          :loading="loading"
          sticky="header"
          :ui="{
            base: 'border-separate border-spacing-0',
            tbody: '[&>tr]:last:[&>td]:border-b-0',
            tr: 'hover:bg-elevated/50',
            td: 'border-b border-default py-1 px-2'
          }"
        />

        <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
          <div class="text-sm text-muted">
            {{ $t('associate.selectedRows', {
              selected: table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0,
              total: table?.tableApi?.getFilteredRowModel().rows.length || 0
            }) }}
          </div>
        </div>
      </template>

      <AssociatesListMapView
        v-else
        :associates="associates"
        :geocodes="geocodes"
        :loading="loading || geocodesLoading"
      />
    </template>
  </UDashboardPanel>
</template>
