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
  title: t('settingsNotifications.sections.channels.title'),
  description: t('settingsNotifications.sections.channels.description'),
  fields: [{
    name: 'email',
    label: t('settingsNotifications.fields.email.label'),
    description: t('settingsNotifications.fields.email.description')
  }, {
    name: 'desktop',
    label: t('settingsNotifications.fields.desktop.label'),
    description: t('settingsNotifications.fields.desktop.description')
  }]
}, {
  title: t('settingsNotifications.sections.accountUpdates.title'),
  description: t('settingsNotifications.sections.accountUpdates.description'),
  fields: [{
    name: 'weekly_digest',
    label: t('settingsNotifications.fields.weeklyDigest.label'),
    description: t('settingsNotifications.fields.weeklyDigest.description')
  }, {
    name: 'product_updates',
    label: t('settingsNotifications.fields.productUpdates.label'),
    description: t('settingsNotifications.fields.productUpdates.description')
  }, {
    name: 'important_updates',
    label: t('settingsNotifications.fields.importantUpdates.label'),
    description: t('settingsNotifications.fields.importantUpdates.description')
  }]
}])

async function onChange() {
  // Do something with data
  console.log(state)
}
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
        <USwitch
          v-model="state[field.name]"
          @update:model-value="onChange"
        />
      </UFormField>
    </UPageCard>
  </div>
</template>
