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
const isModalOpen = ref(false)

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

onMounted(() => {
  if (route.query.action === 'create') {
    isModalOpen.value = true
    router.replace({ query: {} })
  }
})

const table = useTemplateRef('table')

// Collega i link della sidebar (/associates?status=pending|active|to_renew) al
// filtro della colonna membership_status, applicabile solo dopo il mount di UTable.
function applyMembershipStatusFilterFromQuery() {
  const statusColumn = table.value?.tableApi?.getColumn('membership_status')
  if (!statusColumn) return
  const status = route.query.status
  statusColumn.setFilterValue(typeof status === 'string' ? status : undefined)
}

onMounted(() => nextTick(applyMembershipStatusFilterFromQuery))
watch(() => route.query.status, applyMembershipStatusFilterFromQuery)

// Conteggi reali per stato di tesseramento, per le tab sopra la tabella
// (sostituiscono i vecchi link statici in sidebar).
const associatesStatusCounts = computed(() => {
  const counts = { pending: 0, active: 0, to_renew: 0 }
  for (const associate of associates.value) {
    if (associate.membership_status in counts) {
      counts[associate.membership_status as keyof typeof counts]++
    }
  }
  return counts
})

const statusTabs = computed<TabsItem[]>(() => [
  { label: t('associate.tabs.all'), value: 'all' },
  { label: t('associate.tabs.pending'), value: 'pending', badge: associatesStatusCounts.value.pending },
  { label: t('associate.tabs.active'), value: 'active', badge: associatesStatusCounts.value.active },
  { label: t('associate.tabs.toRenew'), value: 'to_renew', badge: associatesStatusCounts.value.to_renew }
])

const activeStatusTab = computed({
  get: () => (typeof route.query.status === 'string' ? route.query.status : 'all'),
  set: (value: string | number) => {
    router.replace({ query: { ...route.query, status: value === 'all' ? undefined : value } })
  }
})

const columnFilters = ref([])

// TODO utilizzare il mapping per la traduzione delle intestazioni
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
    header: columnHeaders.id,
    cell: ({ row }) => row.original.id
  },
  {
    accessorKey: 'uuid',
    header: columnHeaders.uuid,
    cell: ({ row }) => renderNeutralBadge(row.original.uuid)
  },
  {
    accessorKey: 'created_at',
    header: columnHeaders.created_at,
    cell: ({ row }) => formatDateTime(row.original.created_at)
  },
  {
    accessorKey: 'updated_at',
    header: columnHeaders.updated_at,
    cell: ({ row }) => formatDateTime(row.original.updated_at)
  },
  {
    accessorKey: 'updated_by',
    header: columnHeaders.updated_by,
    cell: ({ row }) => row.original.updated_by
  },
  {
    accessorKey: 'membership_request_status',
    header: columnHeaders.membership_request_status,
    cell: ({ row }) => {
      const status = row.getValue('membership_request_status') as string
      const statusConfig: Record<string, { color: string, icon: string }> = {
        approved: { color: 'success', icon: 'i-lucide-check-circle' },
        pending: { color: 'warning', icon: 'i-lucide-circle-dot-dashed' },
        rejected: { color: 'error', icon: 'i-lucide-x-circle' }
      }
      const { color, icon } = statusConfig[status] || { color: 'neutral', icon: 'i-lucide-help-circle' }

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
    header: columnHeaders.membership_status,
    cell: ({ row }) => {
      const status = row.getValue('membership_status') as string
      const statusConfig: Record<string, { color: string, icon: string }> = {
        active: { color: 'success', icon: 'i-lucide-check-circle' },
        to_renew: { color: 'warning', icon: 'i-lucide-refresh-cw' },
        expired: { color: 'error', icon: 'i-lucide-ban' },
        pending: { color: 'warning', icon: 'i-lucide-circle-dot-dashed' },
        rejected: { color: 'error', icon: 'i-lucide-x-circle' }
      }
      const { color, icon } = statusConfig[status] || { color: 'neutral', icon: 'i-lucide-help-circle' }

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
    header: columnHeaders.request_date,
    cell: ({ row }) => formatDateTime(row.original.request_date)
  },
  {
    accessorKey: 'payment_date',
    header: columnHeaders.payment_date,
    cell: ({ row }) => formatDate(row.original.payment_date)
  },
  {
    accessorKey: 'association_date',
    header: columnHeaders.association_date,
    cell: ({ row }) => formatDate(row.original.association_date)
  },
  {
    accessorKey: 'associate_type',
    header: columnHeaders.associate_type,
    cell: ({ row }) => row.original.associate_type
  },
  {
    accessorKey: 'pauperwave_associate_number',
    header: columnHeaders.pauperwave_associate_number,
    cell: ({ row }) => row.original.pauperwave_associate_number || ''
  },
  {
    accessorKey: 'consent_data',
    header: columnHeaders.consent_data,
    cell: ({ row }) => renderConsentBadge(row.original.consent_data)
  },
  {
    accessorKey: 'consent_social',
    header: columnHeaders.consent_social,
    cell: ({ row }) => renderConsentBadge(row.original.consent_social)
  },
  {
    accessorKey: 'has_read_statute',
    header: columnHeaders.has_read_statute,
    cell: ({ row }) => renderConsentBadge(row.original.has_read_statute)
  },
  {
    accessorKey: 'has_acknowledged_surveillance_notice',
    header: columnHeaders.has_acknowledged_surveillance_notice,
    cell: ({ row }) => renderConsentBadge(row.original.has_acknowledged_surveillance_notice)
  },
  {
    accessorKey: 'first_name',
    header: columnHeaders.first_name,
    cell: ({ row }) => row.original.first_name
  },
  {
    accessorKey: 'last_name',
    header: columnHeaders.last_name,
    cell: ({ row }) => row.original.last_name
  },
  {
    accessorKey: 'email_address',
    header: columnHeaders.email_address,
    cell: ({ row }) => renderNeutralBadge(row.original.email_address)
  },
  {
    accessorKey: 'phone_number',
    header: columnHeaders.phone_number,
    cell: ({ row }) => row.original.phone_number
  },
  {
    accessorKey: 'tax_code',
    header: columnHeaders.tax_code,
    cell: ({ row }) => row.original.tax_code
  },
  {
    accessorKey: 'born_date',
    header: columnHeaders.born_date,
    cell: ({ row }) => formatDate(row.original.born_date)
  },
  {
    accessorKey: 'born_location',
    header: columnHeaders.born_location,
    cell: ({ row }) => row.original.born_location || ''
  },
  {
    accessorKey: 'born_province',
    header: columnHeaders.born_province,
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
    cell: ({ row }) => row.original.residency_house_number || ''
  },
  {
    accessorKey: 'residency_city',
    header: columnHeaders.residency_city,
    cell: ({ row }) => row.original.residency_city
  },
  {
    accessorKey: 'residency_province',
    header: columnHeaders.residency_province,
    cell: ({ row }) => row.original.residency_province
  },
  {
    accessorKey: 'residency_cap',
    header: columnHeaders.residency_cap,
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

function renderConsentBadge(consentvalue: boolean) {
  const consent = consentvalue
  const consentConfig: Record<string, { label: string, color: string, icon: string }> = {
    yes: { label: t('common.yes'), color: 'success', icon: 'i-lucide-check-circle' },
    no: { label: t('common.no'), color: 'error', icon: 'i-lucide-circle-x' }
  }

  return h(resolveComponent('UBadge'), {
    variant: 'subtle',
    class: 'w-[60px]',
    ...consentConfig[consent ? 'yes' : 'no']
  })
}

const consentSocialOptions = [
  { label: t('associate.consentSocialOptions.all'), value: 'all', icon: 'i-lucide-megaphone', color: 'neutral' },
  { label: t('associate.consentSocialOptions.yes'), value: 'yes', icon: 'i-lucide-check-circle', color: 'success' },
  { label: t('associate.consentSocialOptions.no'), value: 'no', icon: 'i-lucide-circle-x', color: 'error' }
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
      <UDashboardNavbar :title="$t('associate.breadcrumb')" :ui="{ right: 'gap-4' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ViewModeTabs v-model="viewMode" :items="viewModeItems" />
          <AssociatesListAddModal v-model="isModalOpen" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <template v-if="viewMode === 'table'">
        <UTabs
          v-model="activeStatusTab"
          :items="statusTabs"
          variant="link"
          class="w-full"
        />

        <div class="flex flex-wrap items-end justify-between gap-1.5">
          <div class="flex flex-wrap items-end gap-1.5">
            <UInput
              :model-value="(
                table?.tableApi?.getColumn('email_address')?.getFilterValue() as string
              )"
              class="max-w-sm"
              icon="i-lucide-search"
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
          </div>

          <div class="flex flex-wrap items-end gap-1.5">
            <AssociatesListDeleteModal
              :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            >
              <UButton
                v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
                :label="$t('common.delete')"
                color="error"
                variant="subtle"
                icon="i-lucide-trash"
              >
                <template #trailing>
                  <UKbd>
                    {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}
                  </UKbd>
                </template>
              </UButton>
            </AssociatesListDeleteModal>

            <UDropdownMenu
              :items="visibilityItems"
              :content="{ align: 'end' }"
            >
              <UButton
                :label="$t('common.showColumns')"
                color="neutral"
                variant="outline"
                trailing-icon="i-lucide-settings-2"
              />
            </UDropdownMenu>
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="outline"
              :loading="loading"
              @click="refresh"
            />
          </div>
        </div>

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
          :ui="{
            base: 'border-separate border-spacing-0',
            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
            tbody: '[&>tr]:last:[&>td]:border-b-0',
            th: 'py-1 px-1.5 border-y border-default first:rounded-l-lg last:rounded-r-lg',
            td: 'border-b border-default py-1 px-2 font-mono'
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
