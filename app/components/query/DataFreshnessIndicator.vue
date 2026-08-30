<!-- app\components\query\DataFreshnessIndicator.vue -->
<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface Props {
  lastUpdatedAt: Date | null
}

const { lastUpdatedAt } = defineProps<Props>()
const { t } = useI18n()

// Ticks the relative label forward on its own — without this "2 minuti fa" would
// freeze until some unrelated re-render happened to touch the component.
const now = ref(Date.now())
let interval: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  interval = setInterval(() => {
    now.value = Date.now()
  }, 30_000)
})
onUnmounted(() => clearInterval(interval))

const relativeTime = computed(() => {
  if (!lastUpdatedAt) return null
  void now.value
  return formatDistanceToNow(lastUpdatedAt, { addSuffix: true, locale: it })
})
</script>

<template>
  <div
    v-if="relativeTime"
    class="flex items-center gap-1.5 text-xs text-muted"
  >
    <span class="size-1.5 rounded-full bg-success" />
    <!-- Text drops below `lg` — same "icon/dot survives, label goes" collapse
         as StatusFilterGroup's icon-only mode: the navbar rows this sits in
         (transactions/tournaments/leagues/events) got crowded once a search
         box joined the title + refresh control on the same non-wrapping row
         (user request, 2026-08-30). -->
    <span class="hidden lg:inline">{{ t('common.dataFreshness', { time: relativeTime }) }}</span>
  </div>
</template>
