<!-- app\pages\(community)\associate\[slug].vue -->
<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const { data: associates, isLoading: loading } = useAssociatesQuery()
const { breadcrumbItems } = useBreadcrumbs()

const associate = computed(() => (associates.value ?? [])
  .find(item => slugify(`${item.first_name} ${item.last_name}`) === route.params.slug))

useSeoMeta({
  title: () => associate.value
    ? `${associate.value.first_name} ${associate.value.last_name}`
    : t('associate.breadcrumb')
})

const editModalOpen = ref(false)
</script>

<template>
  <UDashboardPanel id="associate-detail">
    <template #header>
      <UDashboardNavbar
        :title="associate
          ? `${associate.first_name} ${associate.last_name}`
          : t('associate.breadcrumb')"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            v-if="associate"
            :label="$t('associate.editModal.openButton')"
            :icon="ICONS.edit"
            color="neutral"
            variant="outline"
            @click="editModalOpen = true"
          />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon :name="ICONS.loading" class="animate-spin text-3xl text-muted" />
      </div>

      <EmptyState
        v-else-if="!associate"
        :message="$t('associate.detail.notFound')"
      />

      <div v-else class="flex flex-col gap-4">
        <AssociatesSingleHeaderCard :associate="associate" />
        <AssociatesSingleDetailGrid :associate="associate" />
        <AssociatesSingleMembershipHistoryCard :associate-uuid="associate.uuid" />
        <AssociatesSingleTransactionsCard :associate-uuid="associate.uuid" />
      </div>
    </template>
  </UDashboardPanel>

  <AssociatesListEditModal v-model="editModalOpen" :associate="associate ?? null" />
</template>
