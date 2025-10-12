<script lang="ts" setup>
import { sub } from 'date-fns'
import { h, resolveComponent } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { Range } from '~/types'
import type { Column } from '@tanstack/vue-table'
import type { DropdownMenuItem, ContextMenuItem, TableColumn, TableRow } from '@nuxt/ui'
import { useClipboard } from '@vueuse/core'

const { breadcrumbItems } = useBreadcrumbs()

const UCheckbox = resolveComponent('UCheckbox')
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const toast = useToast()
const { copy } = useClipboard()

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})

const { data: tournaments } = await useFetch('/api/tournaments')

// Use the actual type from useFetch
type TournamentData = NonNullable<typeof tournaments.value>[number]

// TODO utilizzare il mapping per la traduzione delle intestazioni
const columnHeaders: Record<string, string> = {
  select: 'Seleziona',
  id: 'ID',
  status: 'Stato',
  start_date: 'Data e Ora',
  round_count: 'Partite',
  round_duration: 'Durata Partita',
  registered_players: 'Iscritti',
  league: 'Lega',
  format: 'Formato',
  organizer: 'Organizzatore',
  location: 'Luogo',
  entry_fee: 'Quota Iscrizione',
  companion_code: 'Codice Companion'
} as const

const statusOrder = [
  'Scheduled',
  'Postponed',
  'Cancelled',
  'In Progress',
  'Completed'
]

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
        'In Progress': { color: 'warning', icon: 'i-lucide-loader' },
        'Completed': { color: 'success', icon: 'i-lucide-check-circle' }
      }
      const { color, icon } = statusConfig[status] || { color: 'neutral', icon: 'i-lucide-help-circle' }

      return h(UBadge, { class: 'capitalize gap-2', variant: 'subtle', icon, color }, () =>
        row.getValue('status')
      )
    }
  },
  {
    accessorKey: 'start_date',
    header: ({ column }) => getHeader(column, columnHeaders.start_date),
    enableGlobalFilter: true,
    cell: ({ row }) => {
      const value = row.getValue('start_date') as string
      if (!value) return '-'
      // Parse and format timestampz (ISO string)
      const date = new Date(value)
      return date.toLocaleString('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  },
  {
    accessorKey: 'round_count',
    header: columnHeaders.round_count,
    enableGlobalFilter: false,
    cell: ({ row }) => row.getValue('round_count')
  },
  {
    accessorKey: 'round_duration',
    header: columnHeaders.round_duration,
    enableGlobalFilter: true,
    cell: ({ row }) => {
      const duration = row.getValue('round_duration') as number
      return `${duration} min`
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

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () => leagueValue)
    }
  },
  {
    accessorKey: 'format',
    header: ({ column }) => getHeader(column, columnHeaders.format),
    enableGlobalFilter: true,
    cell: ({ row }) => {
      const color = {
        'Commander': 'primary' as const,
        'Commander Party': 'error' as const,
        'Commander Precon': 'warning' as const
      }[row.getValue('format') as string]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
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

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () => organizerValue)
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
  // {
  //   id: 'status',
  //   desc: false
  // }
])

const rowSelection = ref<Record<string, boolean>>({})

function onSelect(row: TableRow<TournamentData>) {
  console.info('Selected row:', row.original.id)
  toast.add({
    title: `Apri torneo del ${row.original.start_date}`,
    color: 'info',
    icon: 'i-lucide-info'
  })
}

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

const columnVisibility = ref({
  id: false,
  location: false,
  companion_code: false
})

const getVisibilityItems = (): DropdownMenuItem[] => {
  return table.value?.tableApi
    ?.getAllColumns()
    .filter(column => column.getCanHide())
    .map(column => ({
      label: columnHeaders[column.id] || column.id,
      type: 'checkbox' as const,
      checked: column.getIsVisible(),
      onUpdateChecked(checked: boolean) {
        table.value?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
      },
      onSelect(e: Event) {
        e.preventDefault()
      }
    })) ?? []
}

const globalFilter = ref('')

const pagination = ref({
  pageIndex: 0,
  pageSize: 15
})
</script>

<template>
  <UDashboardPanel id="events">
    <template #header>
      <UDashboardNavbar title="Eventi">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TournamentsListAddModal />
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
          <UDropdownMenu
            :items="getVisibilityItems()"
            :content="{ align: 'end' }"
          >
            <UButton
              label="Colonne"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-chevron-down"
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
            :data="tournaments"
            :columns="columns"
            class="shrink-0"
            :ui="{
              base: 'table-fixed border-collapse',
              thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
              tbody: '[&>tr]:last:[&>td]:border-b-0',
              th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
              td: 'border-b border-default py-3 leading-tight'
            }"
            :pagination-options="{
              getPaginationRowModel: getPaginationRowModel()
            }"
            @select="onSelect"
            @contextmenu="onContextmenu"
          />
        </UContextMenu>

        <div class="px-4 py-3.5 border-t border-accented text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} su
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} riga(e) selezionata(e).
        </div>

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
