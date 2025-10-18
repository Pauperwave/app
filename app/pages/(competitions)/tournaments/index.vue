<script lang="ts" setup>
import { sub, add } from 'date-fns'
import { h, resolveComponent } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { Range } from '~/types'
import type { Column, ColumnFiltersState } from '@tanstack/vue-table'
import type { DropdownMenuItem, ContextMenuItem, TableColumn, TableRow } from '@nuxt/ui'
import { useClipboard } from '@vueuse/core'

const UCheckbox = resolveComponent('UCheckbox')
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const route = useRoute()
const router = useRouter()
const isModalOpen = ref(false)

onMounted(() => {
  if (route.query.action === 'create') {
    isModalOpen.value = true
    router.replace({ query: {} })
  }
})

const { breadcrumbItems } = useBreadcrumbs()
const toast = useToast()
const { copy } = useClipboard()

// date range filter
// Mostra tornei dal mese scorso al mese prossimo
const range = ref<Range>({
  start: sub(new Date(), { months: 1 }), // 1 mese fa
  end: add(new Date(), { months: 1 }) // 1 mese nel futuro
})

// Resetting the row selection and pagination when the date range changes
// This ensures that the user sees the first page of results and no rows are selected
// Also the number of filtered rows is updated
watch(range, () => {
  rowSelection.value = {}
  pagination.value.pageIndex = 0
})

const { data: tournaments } = await useFetch('/api/tournaments')

// Use the actual type from useFetch
type TournamentData = NonNullable<typeof tournaments.value>[number]

// Computed per filtrare i tornei in base al range
const filteredTournaments = computed(() => {
  if (!tournaments.value) return []

  // Validazione del range
  if (!range.value?.start || !range.value?.end) return tournaments.value

  const startDate = new Date(range.value.start)
  const endDate = new Date(range.value.end)

  // Imposta ore per il confronto corretto
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 999)

  return tournaments.value.filter((tournament) => {
    // Gestisci il caso in cui start_date sia null/undefined
    if (!tournament.start_date) return false

    const tournamentDate = new Date(tournament.start_date)

    // Validazione della data
    if (isNaN(tournamentDate.getTime())) return false

    return tournamentDate >= startDate && tournamentDate <= endDate
  })
})

// TODO utilizzare il mapping per la traduzione delle intestazioni
const columnHeaders = {
  select: 'Seleziona',
  id: 'ID',
  status: 'Stato',
  start_date: 'Data e Ora',
  round_count: 'Turni',
  round_duration: 'Durata Turni',
  registered_players: 'Iscritti',
  league: 'Lega',
  format: 'Formato',
  organizer: 'Organizzatore',
  location: 'Luogo',
  entry_fee: 'Quota Iscrizione',
  companion_code: 'Codice Companion'
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

// Custom order for status sorting
// Change as needed
// Statuses not in this list will be sorted alphabetically after these
const statusOrder = [
  'In Progress',
  'Scheduled',
  'Completed',
  'Cancelled',
  'Postponed'
]

// Define table columns
const columns: TableColumn<TournamentData>[] = [
  {
    id: 'select',
    enableHiding: false,
    enableSorting: false,
    enableGlobalFilter: false,
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
    enableGlobalFilter: false,
    cell: ({ row }) => `#${row.getValue('id')}`
  },
  {
    accessorKey: 'status',
    header: ({ column }) => getHeader(column, columnHeaders.status),
    sortingFn: (rowA, rowB, columnId) => {
      const statusA = rowA.getValue(columnId) as string
      const statusB = rowB.getValue(columnId) as string

      const indexA = statusOrder.indexOf(statusA)
      const indexB = statusOrder.indexOf(statusB)

      return indexA - indexB
    },
    enableGlobalFilter: true,
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      const statusConfig: Record<string, { color: string, icon: string }> = {
        'Scheduled': { color: 'info', icon: 'i-lucide-clock' },
        'Postponed': { color: 'neutral', icon: 'i-lucide-pause-circle' },
        'Cancelled': { color: 'error', icon: 'i-lucide-x-circle' },
        'In Progress': { color: 'warning', icon: 'i-lucide-circle-dot-dashed' },
        'Completed': { color: 'success', icon: 'i-lucide-check-circle' }
      }
      const { color, icon } = statusConfig[status] || { color: 'neutral', icon: 'i-lucide-help-circle' }

      return h(UBadge, {
        class: 'capitalize cursor-pointer hover:opacity-80 transition-opacity gap-2',
        variant: 'subtle',
        icon,
        color,
        onClick: (e: Event) => handleColumnFilter(e, 'status', status, 'Stato')
      }, () =>
        row.getValue('status')
      )
    }
  },
  {
    accessorKey: 'start_date',
    // Custom accessor function for date formatting
    // It is necessary to keep sorting working correctly
    id: 'start_date',
    accessorFn: (row) => {
      const value = row.start_date as string
      if (!value) return '-'

      const date = new Date(value)
      return date.toLocaleString('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    header: ({ column }) => getHeader(column, columnHeaders.start_date),
    enableGlobalFilter: true,
    // Custom sorting function, parse the original date strings instead of the formatted ones
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.original.start_date).getTime()
      const dateB = new Date(rowB.original.start_date).getTime()
      return dateA - dateB
    },
    cell: ({ row }) => row.getValue('start_date')
  },
  {
    accessorKey: 'round_count',
    header: columnHeaders.round_count,
    enableGlobalFilter: false,
    cell: ({ row }) => row.getValue('round_count')
  },
  {
    accessorKey: 'round_duration',
    header: ({ column }) => getHeader(column, columnHeaders.round_duration),
    enableGlobalFilter: false, // Prevents text search from matching "60"
    filterFn: (row, columnId, filterValue) => {
      const cellValue = Number(row.getValue(columnId))
      const targetValue = Number(filterValue)
      return cellValue === targetValue
    },
    cell: ({ row }) => {
      const duration = Number(row.getValue('round_duration'))
      let color: 'success' | 'neutral' | 'warning'
      if (duration < 50) {
        color = 'warning'
      } else if (duration === 50) {
        color = 'neutral'
      } else {
        color = 'success'
      }
      return h(UBadge, {
        class: 'capitalize cursor-pointer hover:opacity-80 transition-opacity',
        variant: 'subtle',
        color,
        onClick: (e: Event) => handleColumnFilter(e, 'round_duration', duration.toString(), 'Durata Partita')
      }, () => `${duration} minuti`)
    }
  },
  {
    accessorKey: 'registered_players',
    header: ({ column }) => getHeader(column, columnHeaders.registered_players),
    enableGlobalFilter: false,
    cell: ({ row }) => row.getValue('registered_players')
  },
  {
    accessorKey: 'league',
    header: ({ column }) => getHeader(column, columnHeaders.league),
    enableGlobalFilter: true,
    cell: ({ row }) => {
      const leagueValue = row.getValue('league') as string
      const colorMap: Record<string, 'neutral'> = {
        'Magman Autunno 2025': 'neutral'
      }
      const color = colorMap[leagueValue] || ('neutral' as const)

      return h(UBadge, {
        class: 'capitalize cursor-pointer hover:opacity-80 transition-opacity',
        variant: 'subtle',
        color,
        onClick: (e: Event) => handleColumnFilter(e, 'league', leagueValue, 'Lega')
      }, () => leagueValue)
    }
  },
  {
    accessorKey: 'format',
    header: ({ column }) => getHeader(column, columnHeaders.format),
    enableGlobalFilter: true,
    filterFn: 'equals', // Exact match or use 'includesString' for partial matches
    cell: ({ row }) => {
      const color = {
        'Commander': 'primary' as const,
        'Commander Party': 'error' as const,
        'Commander Precon': 'warning' as const
      }[row.getValue('format') as string]

      return h(UBadge, {
        class: 'capitalize cursor-pointer hover:opacity-80 transition-opacity',
        variant: 'subtle',
        color,
        onClick: (e: Event) => handleColumnFilter(e, 'format', row.getValue('format') as string, 'Formato')
      }, () =>
        row.getValue('format')
      )
    }
  },
  {
    accessorKey: 'organizer',
    header: ({ column }) => getHeader(column, columnHeaders.organizer),
    enableGlobalFilter: true,
    cell: ({ row }) => {
      const organizerValue = row.getValue('organizer') as string
      const colorMap: Record<string, 'neutral'> = {
        Magman: 'neutral'
      }
      const color = colorMap[organizerValue] || ('neutral' as const)

      return h(UBadge, {
        class: 'capitalize cursor-pointer hover:opacity-80 transition-opacity',
        variant: 'subtle',
        color,
        onClick: (e: Event) => handleColumnFilter(e, 'organizer', organizerValue, 'Organizzatore')
      }, () => organizerValue)
    }
  },
  {
    accessorKey: 'location',
    header: columnHeaders.location,
    enableGlobalFilter: true,
    cell: ({ row }) => {
      const locationValue = row.getValue('location') as string
      const colorMap: Record<string, 'neutral'> = {
        Magman: 'neutral'
      }
      const color = colorMap[locationValue] || ('neutral' as const)

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () => locationValue)
    }
  },
  {
    accessorKey: 'entry_fee',
    header: columnHeaders.entry_fee,
    enableGlobalFilter: false,
    cell: ({ row }) => {
      const amount = Number.parseFloat(row.getValue('entry_fee') as string)

      const formatted = new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount)

      return h('div', { class: 'text-right' }, formatted)
    }
  },
  {
    accessorKey: 'companion_code',
    header: columnHeaders.companion_code,
    enableGlobalFilter: false,
    cell: ({ row }) =>
      h('div', { class: 'text-center' }, row.getValue('companion_code') || '-')
  }
]

const table = useTemplateRef('table')

// sorting
// Helper to create sortable headers with dropdown menu
function getHeader(column: Column<TournamentData>, label: string) {
  const isSorted = column.getIsSorted()

  return h(UButton, {
    color: 'neutral',
    variant: 'ghost',
    label,
    icon: isSorted
      ? isSorted === 'asc'
        ? 'i-lucide-arrow-up-narrow-wide'
        : 'i-lucide-arrow-down-wide-narrow'
      : 'i-lucide-arrow-up-down',
    class: '-mx-2.5',
    onClick: () => {
      // Cycle: unsorted -> asc -> desc -> unsorted
      if (!isSorted) {
        column.toggleSorting(false) // asc
      } else if (isSorted === 'asc') {
        column.toggleSorting(true) // desc
      } else {
        column.clearSorting() // unsorted
      }
    }
  })
}

const sorting = ref([
  {
    id: 'status',
    desc: false
  }
])

// row selection
const rowSelection = ref<Record<string, boolean>>({})

function onSelect(row: TableRow<TournamentData>) {
  console.info('Selected row:', row.original.id)
  toast.add({
    title: `Apri torneo del ${row.original.start_date}`,
    color: 'info',
    icon: 'i-lucide-info'
  })
}

// context menu
const items = ref<ContextMenuItem[]>([])

function getRowItems(row: TableRow<TournamentData>) {
  const items: ContextMenuItem[] = []

  // Only add the copy option if companion_code exists
  if (row.original.companion_code) {
    items.push({
      label: 'Copia codice Companion',
      icon: 'i-lucide-copy',
      onSelect() {
        copy(row.original.companion_code!)

        toast.add({
          title: 'Codice Companion copiato negli appunti!',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    })
  }

  items.push(
    {
      label: 'Vedi dettagli torneo',
      icon: 'i-lucide-swords',
      onSelect() {
        toast.add({
          title: 'Vedi dettagli torneo',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    }
  )

  if (row.original.league) {
    items.push({
      label: 'Vedi dettagli lega',
      icon: 'i-lucide-trophy',
      onSelect() {
        toast.add({
          title: 'Vedi dettagli lega',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    })
  }

  if (row.original.event) {
    items.push({
      label: 'Vedi dettagli evento',
      icon: 'i-lucide-calendar',
      onSelect() {
        toast.add({
          title: 'Vedi dettagli evento',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    })
  }

  items.push(
    {
      label: 'Elimina torneo',
      icon: 'i-lucide-trash',
      color: 'error',
      disabled: !row.getIsSelected(), // Enable only if the row is selected
      onSelect() {
        toast.add({
          title: 'Elimina torneo',
          color: 'success',
          icon: 'i-lucide-circle-check'
        })
      }
    }
  )

  return items
}

function onContextmenu(_e: Event, row: TableRow<TournamentData>) {
  items.value = getRowItems(row)
}

// column visibility
const columnVisibility = ref({
  id: false,
  location: false,
  companion_code: false
})

const visibilityItems = computed(() => getVisibilityItems())

// Generate visibility items based on columns that can be hidden
const getVisibilityItems = (): DropdownMenuItem[] => {
  const allColumns = table.value?.tableApi?.getAllColumns()
  if (!allColumns) return []

  return allColumns
    .filter((column: Column<TournamentData>) => column.getCanHide())
    .map(createVisibilityItem)
}

// Helper to create visibility toggle items
function createVisibilityItem(column: Column<TournamentData>): DropdownMenuItem {
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

// global filter
const globalFilter = ref('')

// active filters
const columnFilters = ref<ColumnFiltersState>([])

// Add this helper function in your script setup
function handleColumnFilter(e: Event, columnId: string, value: string, label?: string) {
  // Set column filter
  table.value?.tableApi?.getColumn(columnId)?.setFilterValue(value)

  // Reset to first page
  pagination.value.pageIndex = 0

  // Show toast
  toast.add({
    title: `Filtrato per ${label || columnId}: ${value}`,
    color: 'info',
    icon: 'i-lucide-filter'
  })
}

function clearColumnFilter(columnId: string) {
  table.value?.tableApi?.getColumn(columnId)?.setFilterValue(undefined)
  toast.add({
    title: 'Filtri colonna resettati',
    color: 'info',
    icon: 'i-lucide-x-circle'
  })
}

function clearAllFilters() {
  table.value?.tableApi?.resetColumnFilters()
  toast.add({
    title: 'Tutti i filtri rimossi',
    color: 'success',
    icon: 'i-lucide-filter-x'
  })
}

// Format filter values for display in active filters section
function formatFilterValue(filterId: string, value: string): string {
  // Formatta numeri
  if (filterId === 'round_duration') {
    return `${value} minuti`
  }

  return String(value)
}

// pagination
const pagination = ref({
  pageIndex: 0,
  pageSize: 15
})

// Debug: log changes to column filters
if (import.meta.env.DEV) {
  watch(columnFilters, (newFilters) => {
    console.log('Column filters changed:', JSON.stringify(newFilters, null, 2))
  }, { deep: true })

  watch(globalFilter, (newValue) => {
    console.log('Global filter changed:', newValue)
  })
}
</script>

<template>
  <UDashboardPanel id="events">
    <template #header>
      <UDashboardNavbar title="Eventi">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TournamentsListAddModal v-model="isModalOpen" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
        <template #right>
          <HomeDateRangePicker v-model="range" class="-ms-1" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col flex-1 w-full space-y-4 pb-4">
        <div class="flex justify-between px-4 py-3.5 border-t border-b border-accented">
          <UInput v-model="globalFilter" class="max-w-sm" placeholder="Filtra..." />

          <!-- Active filters display -->
          <div v-if="columnFilters.length" class="flex items-center gap-2">
            <span class="text-sm text-muted">Filtri attivi:</span>
            <UBadge
              v-for="filter in columnFilters"
              :key="filter.id"
              color="info"
              variant="soft"
              class="capitalize"
            >
              {{ getColumnLabel(filter.id) }}: {{ formatFilterValue(filter.id, filter.value as string) }}
              <UButton
                icon="i-lucide-x"
                size="xs"
                color="neutral"
                variant="ghost"
                class="cursor-pointer hover:opacity-80 transition-opacity"
                @click="clearColumnFilter(filter.id)"
              />
            </UBadge>
            <UButton
              label="Cancella tutti"
              icon="i-lucide-x-circle"
              size="xs"
              color="error"
              variant="outline"
              class="cursor-pointer hover:opacity-80 transition-opacity"
              @click="clearAllFilters"
            />
          </div>

          <!-- Column visibility -->
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
        </div>
        <UContextMenu :items="items">
          <UTable
            ref="table"
            v-model:pagination="pagination"
            v-model:sorting="sorting"
            v-model:global-filter="globalFilter"
            v-model:row-selection="rowSelection"
            v-model:column-visibility="columnVisibility"
            v-model:column-filters="columnFilters"
            :data="filteredTournaments"
            :columns="columns"
            class="shrink-0"
            :ui="{
              base: 'table-fixed border-separate border-spacing-0',
              thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
              tbody: '[&>tr]:last:[&>td]:border-b-0',
              th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
              td: 'border-b border-default'
            }"
            :pagination-options="{
              getPaginationRowModel: getPaginationRowModel()
            }"
            @select="onSelect"
            @contextmenu="onContextmenu"
          />
        </UContextMenu>

        <!-- Selected rows info -->
        <div class="px-4 py-3.5 border-t border-accented text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} su
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} riga(e) selezionata(e).
        </div>

        <!-- Pagination controls -->
        <div class="flex justify-center border-t border-default pt-4">
          <UPagination
            :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
