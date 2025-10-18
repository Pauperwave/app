<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Column } from '@tanstack/vue-table'
import { upperFirst } from 'scule'
import type { Associate } from '~/types'
import { format, parseISO } from 'date-fns'

const { associates, loading, refresh } = useAssociates()

const { breadcrumbItems } = useBreadcrumbs()

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

const columnFilters = ref([])

// TODO utilizzare il mapping per la traduzione delle intestazioni
const columnHeaders = {
  select: 'Seleziona',
  id: 'ID',
  uuid: 'UUID',
  created_at: 'Data di creazione',
  updated_at: 'Data di aggiornamento',
  updated_by: 'Aggiornato da',
  request_status: 'Stato richiesta',
  request_date: 'Data richiesta',
  payment_date: 'Data pagamento',
  association_date: 'Data di associazione',
  associate_type: 'Tipo di associato',
  pauperwave_associate_number: 'no. tessera PauperWave',
  consent_data: 'Consenso dati',
  consent_social: 'Consenso social',
  has_read_statute: 'Ha letto lo statuto',
  has_acknowledged_surveillance_notice: 'Visione Privacy',
  first_name: 'Nome',
  last_name: 'Cognome',
  email_address: 'Email',
  phone_number: 'Cellulare',
  tax_code: 'Codice fiscale',
  born_date: 'Data di nascita',
  born_location: 'Luogo di nascita',
  born_province: 'Provincia di nascita',
  born_state: 'Nazione di nascita',
  residency_address: 'Indirizzo',
  residency_house_number: 'Numero civico',
  residency_city: 'Città',
  residency_province: 'Provincia',
  residency_cap: 'CAP',
  mtgo_nickname: 'Nickname MTGO',
  mtga_nickname: 'Nickname MTGA'
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
        'aria-label': 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'aria-label': 'Select row'
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
    accessorKey: 'request_status',
    header: columnHeaders.request_status,
    cell: ({ row }) => {
      const status = row.getValue('request_status') as string
      const statusConfig: Record<string, { color: string, icon: string }> = {
        accepted: { color: 'success', icon: 'i-lucide-check-circle' },
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
          const statusColumn = table?.value?.tableApi?.getColumn('request_status')
          if (statusColumn) {
            statusColumn.setFilterValue(status)
          }
        }
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
    yes: { label: 'Yes', color: 'success', icon: 'i-lucide-check-circle' },
    no: { label: 'No', color: 'error', icon: 'i-lucide-circle-x' }
  }

  return h(resolveComponent('UBadge'), {
    variant: 'subtle',
    class: 'w-[60px]',
    ...consentConfig[consent ? 'yes' : 'no']
  })
}

const requestStatusOptions = [
  { label: 'Tutti', value: 'all', icon: 'i-lucide-list', color: 'neutral' },
  { label: 'Accettati', value: 'accepted', icon: 'i-lucide-check-circle', color: 'success' },
  { label: 'In attesa', value: 'pending', icon: 'i-lucide-clock', color: 'warning' },
  { label: 'Rifiutati', value: 'rejected', icon: 'i-lucide-x-circle', color: 'error' }
]

const consentSocialOptions = [
  { label: 'Tutti', value: 'all', icon: 'i-lucide-list', color: 'neutral' },
  { label: 'Concesso', value: 'yes', icon: 'i-lucide-check-circle', color: 'success' },
  { label: 'Negato', value: 'no', icon: 'i-lucide-circle-x', color: 'error' }
]

const requestStatusFilter = ref('accepted')
const consentSocialFilter = ref('all')

// Oggetto per tracciare quale filtro è attivo
const activeFilter = ref<'request_status' | 'consent_social' | null>(null)

watch(() => requestStatusFilter.value, (newVal) => {
  if (!table?.value?.tableApi) return

  const statusColumn = table.value.tableApi.getColumn('request_status')
  if (!statusColumn) return

  if (newVal === 'all') {
    statusColumn.setFilterValue(undefined)
    if (activeFilter.value === 'request_status') {
      activeFilter.value = null
    }
  } else {
    // Resetta l'altro filtro se attivo
    if (activeFilter.value === 'consent_social') {
      consentSocialFilter.value = 'all'
      const consentColumn = table.value.tableApi.getColumn('consent_social')
      if (consentColumn) consentColumn.setFilterValue(undefined)
    }

    activeFilter.value = 'request_status'
    statusColumn.setFilterValue(newVal)
  }
})

watch(() => consentSocialFilter.value, (newVal) => {
  if (!table?.value?.tableApi) return

  const consentColumn = table.value.tableApi.getColumn('consent_social')
  if (!consentColumn) return

  if (newVal === 'all') {
    consentColumn.setFilterValue(undefined)
    if (activeFilter.value === 'consent_social') {
      activeFilter.value = null
    }
  } else {
    // Resetta l'altro filtro se attivo
    if (activeFilter.value === 'request_status') {
      requestStatusFilter.value = 'all'
      const statusColumn = table.value.tableApi.getColumn('request_status')
      if (statusColumn) statusColumn.setFilterValue(undefined)
    }

    activeFilter.value = 'consent_social'
    consentColumn.setFilterValue(newVal === 'yes')
  }
})
</script>

<template>
  <UDashboardPanel id="associates">
    <template #header>
      <UDashboardNavbar title="Associati">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <AssociatesListAddModal v-model="isModalOpen" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <div class="flex flex-wrap items-end gap-1.5">
          <UInput
            :model-value="(table?.tableApi?.getColumn('email_address')?.getFilterValue() as string)"
            class="max-w-sm"
            icon="i-lucide-search"
            placeholder="Filter emails..."
            @update:model-value="table?.tableApi?.getColumn('email_address')?.setFilterValue($event)"
          />

          <UStatusSelect
            v-model="requestStatusFilter"
            :items="requestStatusOptions"
            label="Stato richiesta"
            name="requestStatusFilter"
          />

          <UStatusSelect
            v-model="consentSocialFilter"
            :items="consentSocialOptions"
            label="Consenso Social"
            name="consentSocialFilter"
          />
        </div>

        <div class="flex flex-wrap items-end gap-1.5">
          <AssociatesListDeleteModal :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length">
            <UButton
              v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
              label="Delete"
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
              label="Mostra colonne"
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
        virtualize
        :data="associates"
        :columns="columns"
        class="flex-1 h-80 shrink-0"
        :loading="loading"
        :ui="{
          base: 'border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-1 px-1.5 border-y border-x border-default first:rounded-l-lg last:rounded-r-lg',
          td: 'border-b border-x border-default py-1 px-2 font-mono'
        }"
      />

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} di
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} righe selezionate.
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
