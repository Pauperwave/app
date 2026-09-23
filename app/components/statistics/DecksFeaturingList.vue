<!-- app\components\statistics\DecksFeaturingList.vue -->
<!-- "Mazzi che lo usano" section — icon+heading, a badge per deck linking
     to its owner, or an empty state. Shared by statistics/commanders/
     [commanderSlug].vue and statistics/decks/[deckSlug].vue, which
     independently duplicated this exact block (fallow:dupes, 2026-09-23).
     `partnerName` is only ever set by the commanders page (a deck's other
     commander) — the badge's partner-suffix span simply doesn't render
     when it's absent. -->
<script setup lang="ts">
interface Entry {
  deckUuid: string
  playerSlug: string | null
  playerLabel: string | null
  partnerName?: string | null
}

const { entries, linkTo } = defineProps<{
  entries: Entry[]
  linkTo: (entry: Entry) => string | undefined
}>()

const { t } = useI18n()
</script>

<template>
  <div class="space-y-3">
    <h2 class="text-lg font-bold flex items-center gap-2">
      <UIcon :name="ICONS.players" class="size-5 text-primary" />
      {{ t('commander.page.decksHeading') }}
    </h2>

    <div v-if="entries.length" class="flex flex-wrap gap-2">
      <NuxtLink
        v-for="entry in entries"
        :key="entry.deckUuid"
        :to="linkTo(entry)"
      >
        <UBadge
          color="neutral"
          variant="soft"
          size="lg"
          class="gap-1.5"
        >
          {{ entry.playerLabel ?? t('player.fallbackName') }}
          <span v-if="entry.partnerName" class="text-muted">
            {{ t('commander.page.partnerSuffix', { name: entry.partnerName }) }}
          </span>
        </UBadge>
      </NuxtLink>
    </div>
    <EmptyState v-else :message="t('commander.index.emptyList')" />
  </div>
</template>
