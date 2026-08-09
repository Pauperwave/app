<!-- app\pages\(settings)\settings\domains.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { UBadge, UIcon } from '#components'
import { ICONS } from '~/utils/icons'

const { t } = useI18n()

const NuxtLink = resolveComponent('NuxtLink')

// Routes that actually exist as pages today — everything else in the `route`
// column below is a planned path with no file behind it yet, so linking to it
// would 404 and spam VUE_ROUTER_R0004 warnings on every render of this table.
const builtRoutes = new Set([
  '/',
  '/standings/cittadino',
  '/standings/commander',
  '/standings/premodern',
  '/standings/pauper',
  '/events'
])

interface DomainRow {
  host: string
  purpose: string
  status: 'planned' | 'live' | 'temporary'
  // The route in this Nuxt project that backs (or is planned to back) the
  // subdomain's content — see ADR-011, every subdomain serves from here for now.
  // `/tesseramento` is the only planned-but-unbuilt path left (see `builtRoutes`
  // above); every other non-null route here exists as a page today, though most
  // are still the authenticated dashboard route reused under that name, not the
  // standalone public page the subdomain implies. The four rankings (cittadino +
  // one per format) share the `/standings/*` prefix rather than reusing e.g.
  // `/commanders`, which already means something else (the Commander deck
  // database) — decided 2026-08-09; the three format pages are stubs for now.
  // Null where the subdomain points at a different project entirely
  // (league.pauperwave.org) or nothing is planned yet (blog.pauperwave.org).
  route: string | null
}

// A reminder of the planned pauperwave.org map, not a live registry: nothing here
// is read from DNS or from a deploy, so a row saying "live" only means someone
// wrote that it is. See ADR-011 in docs/PROGRESS.md for why they all serve from
// this same Nuxt project.
const domains = computed<DomainRow[]>(() => [
  { host: 'pauperwave.org', purpose: t('settings.domains.rows.root'), status: 'planned', route: null },
  { host: 'app.pauperwave.org', purpose: t('settings.domains.rows.app'), status: 'planned', route: '/' },
  { host: 'cittadino.pauperwave.org', purpose: t('settings.domains.rows.cittadino'), status: 'planned', route: '/standings/cittadino' },
  { host: 'commander.pauperwave.org', purpose: t('settings.domains.rows.commander'), status: 'planned', route: '/standings/commander' },
  { host: 'premodern.pauperwave.org', purpose: t('settings.domains.rows.premodern'), status: 'planned', route: '/standings/premodern' },
  { host: 'pauper.pauperwave.org', purpose: t('settings.domains.rows.pauper'), status: 'planned', route: '/standings/pauper' },
  { host: 'eventi.pauperwave.org', purpose: t('settings.domains.rows.eventi'), status: 'planned', route: '/events' },
  { host: 'tesseramento.pauperwave.org', purpose: t('settings.domains.rows.tesseramento'), status: 'planned', route: '/tesseramento' },
  { host: 'blog.pauperwave.org', purpose: t('settings.domains.rows.blog'), status: 'live', route: null },
  { host: 'league.pauperwave.org', purpose: t('settings.domains.rows.league'), status: 'live', route: null }
])

const statusColor = {
  planned: 'neutral',
  live: 'success',
  temporary: 'warning'
} as const

const columns: TableColumn<DomainRow>[] = [
  {
    accessorKey: 'host',
    header: () => t('settings.domains.columns.host'),
    cell: ({ row }) => {
      const parts = row.original.host.split('.')
      // Apex domain (pauperwave.org): no subdomain to set apart, no dimming.
      const hostSpan = parts.length <= 2
        ? h('span', { class: 'font-medium text-highlighted' }, row.original.host)
        : h('span', [
          h('span', { class: 'font-medium text-highlighted' }, parts[0]),
          h('span', { class: 'text-dimmed' }, `.${parts.slice(1).join('.')}`)
        ])

      return h('a', {
        href: `https://${row.original.host}`,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'inline-flex items-center gap-1 hover:underline'
      }, [
        hostSpan,
        h(UIcon, { name: ICONS.externalLink, class: 'size-3.5 shrink-0 text-dimmed' })
      ])
    }
  },
  {
    accessorKey: 'route',
    header: () => t('settings.domains.columns.route'),
    cell: ({ row }) => {
      const { route } = row.original
      if (!route) return h('span', { class: 'text-dimmed' }, '—')

      const routeNode = builtRoutes.has(route)
        ? h(NuxtLink, { to: route, class: 'font-mono text-sm hover:underline' }, () => route)
        : h('span', { class: 'font-mono text-sm text-dimmed' }, route)

      return h('span', { class: 'inline-flex items-center gap-1' }, [
        routeNode,
        h('span', { class: 'text-dimmed text-xs' }, `(${t('settings.domains.routeApp')})`)
      ])
    }
  },
  {
    accessorKey: 'status',
    header: () => t('settings.domains.columns.status'),
    cell: ({ row }) => h(UBadge, {
      color: statusColor[row.original.status],
      variant: 'subtle'
    }, () => t(`settings.domains.status.${row.original.status}`))
  },
  {
    accessorKey: 'purpose',
    header: () => t('settings.domains.columns.purpose'),
    meta: { class: { td: 'whitespace-normal' } }
  }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <UAlert
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="$t('settings.domains.warning.title')"
      :description="$t('settings.domains.warning.description')"
    />

    <UPageCard
      :title="$t('settings.domains.title')"
      :description="$t('settings.domains.description')"
      :ui="{ container: 'gap-4' }"
    >
      <UTable :data="domains" :columns="columns" class="w-full" />
    </UPageCard>
  </div>
</template>
