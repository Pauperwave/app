<!-- app\pages\(public)\classifiche\index.vue -->
<script lang="ts" setup>
// Landing page for /classifiche — links out to the four per-format pages
// (pauper/commander/premodern/cittadino), which have no shared parent page
// of their own. Added so links to a general "classifiche" URL (e.g. the
// Telegram bot's /classifiche command, commands/classifiche.ts) resolve to
// something instead of 404ing.
definePageMeta({ layout: 'public-wide' })

const { t } = useI18n()
useSeoMeta({ title: () => t('standings.indexTitle') })

interface FormatLink {
  format: 'pauper' | 'commander' | 'premodern' | 'cittadino'
  label: string
  icon: IconName
}

const formats = computed<FormatLink[]>(() => [
  { format: 'pauper', label: t('standings.pauperBreadcrumb'), icon: ICONS.standings },
  { format: 'commander', label: t('standings.commanderBreadcrumb'), icon: ICONS.commander },
  { format: 'premodern', label: t('standings.premodernBreadcrumb'), icon: ICONS.standings },
  { format: 'cittadino', label: t('standings.cittadinoBreadcrumb'), icon: ICONS.medal }
])
</script>

<template>
  <div class="flex-1 flex flex-col items-center gap-6 px-6 py-8 md:px-10">
    <div class="text-center max-w-lg">
      <h1 class="text-xl font-semibold">
        {{ $t('standings.indexTitle') }}
      </h1>
      <p class="text-sm text-muted mt-1">
        {{ $t('standings.indexSubtitle') }}
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
      <ULink
        v-for="item in formats"
        :key="item.format"
        :to="`/classifiche/${item.format}`"
      >
        <UCard class="hover:ring-2 hover:ring-primary transition-shadow">
          <div class="flex items-center gap-3">
            <UIcon
              :name="item.icon"
              class="size-6 text-primary"
            />
            <span class="font-medium">{{ item.label }}</span>
          </div>
        </UCard>
      </ULink>
    </div>
  </div>
</template>
