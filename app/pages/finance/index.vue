<!-- app\pages\finance\index.vue -->
<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({ title: () => t('nav.finance') })
</script>

<template>
  <PageInDevelopment panel-id="finance" :title="$t('nav.finance')" />
</template>
