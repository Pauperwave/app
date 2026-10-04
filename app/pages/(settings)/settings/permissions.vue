<!-- app\pages\(settings)\settings\permissions.vue -->
<script setup lang="ts">
import type { Row } from '@tanstack/vue-table'
import type { PermissionRow } from '~/utils/settings/permissionRows'

definePageMeta({ permission: 'access-settings' })

const { t } = useI18n()

useSeoMeta({ title: () => t('settings.layout.links.permissions') })

const { rows, columns, legend } = usePermissionsTable()
</script>

<template>
  <UPageCard
    :title="$t('settings.permissions.title')"
    :description="$t('settings.permissions.description')"
    :ui="{ container: 'gap-2' }"
  >
    <template #header>
      <div class="flex items-center gap-4 text-sm text-muted">
        <span
          v-for="item in legend"
          :key="item.access"
          class="flex items-center gap-1.5"
        >
          <UIcon :name="ACCESS_META[item.access].icon" :class="['size-4', ACCESS_META[item.access].color]" />
          {{ item.label }}
        </span>
      </div>
    </template>

    <UTable
      :data="rows"
      :columns="columns"
      class="w-full"
      :meta="{
        class: {
          // Section rows have nothing to divide from (blank cells either side): overrides the ui.tr
          // default below per row. Nuxt UI's tv() slots concatenate meta.class.tr with :ui's tr
          // class rather than tailwind-merging them (both divide-x and divide-x-0 end up in the
          // class list), so plain divide-x-0 lost to divide-x on stylesheet order: the trailing `!`
          // (Tailwind v4 important syntax) forces it
          tr: (row: Row<PermissionRow>) => (row.original.isSection ? 'divide-x-0!' : '')
        }
      }"
      :ui="{
        td: 'py-1.5 px-3 text-sm group-hover:bg-(--ui-bg-elevated)',
        th: 'py-1.5 px-3',
        // Row hover via the public `ui` slot API instead of a scoped :deep() selector: no wrapper
        // div, and no assumption that UTable's internal DOM shape (tbody > tr > td) stays the same
        // across versions (`tr`/`td` are UTable's documented slot names). Standard Tailwind
        // group/group-hover, not an arbitrary variant: `tr` is the group, `td` reacts to its hover.
        // Plain :hover, no transition, as PublicMatrixTable.vue (cheap at this size)
        tr: 'group divide-x divide-default'
      }"
    />
  </UPageCard>
</template>
