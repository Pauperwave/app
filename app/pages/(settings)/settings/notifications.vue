<!-- app\pages\(settings)\settings\notifications.vue -->
<script setup lang="ts">
const { t } = useI18n()

const state = reactive<{ [key: string]: boolean }>({
  email: true,
  desktop: false,
  product_updates: true,
  weekly_digest: false,
  important_updates: true
})

const sections = computed(() => [{
  title: t('settings.notifications.sections.channels.title'),
  description: t('settings.notifications.sections.channels.description'),
  fields: [{
    name: 'email',
    label: t('settings.notifications.fields.email.label'),
    description: t('settings.notifications.fields.email.description')
  }, {
    name: 'desktop',
    label: t('settings.notifications.fields.desktop.label'),
    description: t('settings.notifications.fields.desktop.description')
  }]
}, {
  title: t('settings.notifications.sections.accountUpdates.title'),
  description: t('settings.notifications.sections.accountUpdates.description'),
  fields: [{
    name: 'weekly_digest',
    label: t('settings.notifications.fields.weeklyDigest.label'),
    description: t('settings.notifications.fields.weeklyDigest.description')
  }, {
    name: 'product_updates',
    label: t('settings.notifications.fields.productUpdates.label'),
    description: t('settings.notifications.fields.productUpdates.description')
  }, {
    name: 'important_updates',
    label: t('settings.notifications.fields.importantUpdates.label'),
    description: t('settings.notifications.fields.importantUpdates.description')
  }]
}])
</script>

<template>
  <div v-for="(section, index) in sections" :key="index">
    <UPageCard
      :title="section.title"
      :description="section.description"
      variant="naked"
      class="mb-4"
    />

    <UPageCard variant="subtle" :ui="{ container: 'divide-y divide-default' }">
      <UFormField
        v-for="field in section.fields"
        :key="field.name"
        :name="field.name"
        :label="field.label"
        :description="field.description"
        class="flex items-center justify-between not-last:pb-4 gap-2"
      >
        <USwitch v-model="state[field.name]" />
      </UFormField>
    </UPageCard>
  </div>
</template>
