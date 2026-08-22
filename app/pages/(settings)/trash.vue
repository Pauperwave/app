<!-- app\pages\(settings)\trash.vue -->
<script lang="ts" setup>
import type { TrashItem } from '~/types'

definePageMeta({ permission: 'view-trash' })

const { t } = useI18n()

useSeoMeta({ title: () => t('trash.breadcrumb') })

const {
  data: trashData, isLoading: loading, isPending, status, refetch
} = useTrashQuery()
const data = computed(() => trashData.value ?? [])
const skeletonCount = computed(() => (isPending.value ? undefined : data.value.length))

const { restoreItem } = useTrashMutations()
const toast = useToast()

async function onRestore(item: TrashItem) {
  await restoreItem.mutateAsync({ entity: item.entity, id: item.id })
  toast.add({
    title: t('trash.restoreSuccess', { name: item.name }),
    color: 'success',
    icon: ICONS.success
  })
}

const { columns } = useTrashTableColumns(onRestore)

const sorting = ref([{ id: 'deletedAt', desc: true }])
</script>

<template>
  <UDashboardPanel id="trash">
    <template #header>
      <UDashboardNavbar :title="$t('trash.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <USeparator orientation="vertical" class="h-4" />

          <QueryRefreshControl :is-loading="loading" :status="status" @refresh="refetch" />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6">
        <UAlert
          color="info"
          variant="subtle"
          :icon="ICONS.info"
          :title="$t('trash.info.title')"
          :description="`${$t('trash.info.enabled')} ${$t('trash.info.disabled')}`"
        />

        <ListSkeleton v-if="isPending" :count="skeletonCount" :columns="columns.length" />

        <template v-else-if="data.length">
          <UTable
            v-model:sorting="sorting"
            :data="data"
            :columns="columns"
            :loading="loading"
            class="w-full"
          />
        </template>

        <p v-else class="text-muted text-sm text-center py-12">
          {{ $t('trash.empty') }}
        </p>
      </div>
    </template>
  </UDashboardPanel>
</template>
