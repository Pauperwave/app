<!-- app\components\wanted-cards\list\GridView.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WantedCard } from '~/types'

interface GridSection {
  /** null = nessun raggruppamento attivo, nessuna intestazione di sezione. */
  player: string | null
  cards: WantedCard[]
}

const { sections, contextMenuItems, showStatus = false } = defineProps<{
  sections: GridSection[]
  contextMenuItems: (card: WantedCard) => DropdownMenuItem[]
  /** Mostra il badge di stato (Trovata/In cerca) — solo quando la tab attiva è "Tutte", dove altrimenti non sarebbe chiaro dal filtro. */
  showStatus?: boolean
}>()

const { t } = useI18n()

const hasCards = computed(() => sections.some(section => section.cards.length))

// Ancora lo step "anatomia di una carta" del tour guidato (vedi useTour in
// wanted-cards/index.vue) sulla prima card renderizzata, qualunque sia la
// sezione/il raggruppamento attivo.
const firstCardId = computed(() => sections.flatMap(section => section.cards)[0]?.id)
</script>

<template>
  <div v-if="!hasCards" class="text-center py-12 text-muted">
    {{ $t('wantedCard.grid.empty') }}
  </div>

  <div v-else class="flex flex-col gap-6">
    <div v-for="section in sections" :key="section.player ?? '__ungrouped'">
      <div v-if="section.player" class="flex items-center gap-1.5 mb-3">
        <PlayerTag :name="section.player" />
        <UBadge color="neutral" variant="subtle" size="sm">
          {{ section.cards.length }}
        </UBadge>
      </div>

      <!-- auto-fill invece di breakpoint fissi: le card si dimensionano da
           sole in base allo spazio disponibile, restando vicine alle
           proporzioni reali di una carta MTG (63×88mm ≈ rapporto 5:7, vedi
           aspect-[5/7] sull'immagine). 280px = w-70, stessa larghezza usata
           per l'anteprima singola in CardPreviewTooltip.vue (copiato da
           MagicTheGathering/blog's magic/card/Tooltip.vue) — stessa taglia
           di riferimento per una carta in tutto l'ecosistema. min(280px,45vw)
           evita che quel minimo forzi l'overflow su schermi stretti (mobile):
           lì la colonna si restringe in proporzione al viewport invece. -->
      <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,45vw),1fr))]">
        <UContextMenu
          v-for="card in section.cards"
          :key="card.id"
          :items="contextMenuItems(card)"
        >
          <UCard
            :id="card.id === firstCardId ? 'tour-wanted-cards-first-card' : undefined"
            :ui="{ body: 'p-0 sm:p-0', footer: 'p-3 sm:p-3' }"
            class="overflow-hidden"
          >
            <img
              v-if="card.imageUrl"
              :src="card.imageUrl"
              :alt="card.cardName"
              class="w-full aspect-[5/7] object-cover"
            >
            <div v-else class="w-full aspect-[5/7] bg-elevated flex items-center justify-center">
              <UIcon name="i-lucide-image-off" class="size-8 text-muted" />
            </div>

            <template #footer>
              <!-- Riga unica quando raggruppato per giocatore: senza
                   PlayerTag (già nell'intestazione di sezione) la prima riga
                   resterebbe altrimenti con il solo prezzo, sprecando
                   spazio. Da ungrouped le due righe sono già entrambe
                   piene, quindi restano separate. -->
              <div v-if="section.player" class="flex flex-wrap items-center gap-1.5">
                <UTooltip v-if="card.notes" :text="card.notes">
                  <UIcon name="i-lucide-message-circle" class="size-4 text-muted shrink-0" />
                </UTooltip>
                <UBadge color="neutral" variant="subtle">
                  {{ card.copies }}×
                </UBadge>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  :icon="WANTED_CARD_LANGUAGE_ICONS[card.language] ?? 'i-lucide-languages'"
                  class="gap-2"
                >
                  {{ t(`wantedCard.languages.${card.language || 'any'}`) }}
                </UBadge>
                <UBadge
                  v-for="treatment in card.treatment"
                  :key="treatment"
                  color="neutral"
                  variant="subtle"
                >
                  {{ t(`wantedCard.treatments.${treatment}`) }}
                </UBadge>

                <WantedCardsAge :date="card.date" />

                <div class="flex items-center gap-1.5 ms-auto shrink-0">
                  <UTooltip v-if="showStatus" :text="t(`wantedCard.status.${card.status}`)">
                    <UBadge
                      :color="wantedCardStatusColor(card.status)"
                      variant="subtle"
                      :icon="WANTED_CARD_STATUS_ICONS[card.status]"
                      :aria-label="t(`wantedCard.status.${card.status}`)"
                    />
                  </UTooltip>
                  <WantedCardsPrices
                    :cardmarket-price="card.cardmarketPrice"
                    :cardtrader-price="card.cardtraderPrice"
                  />
                </div>
              </div>

              <div v-else class="flex flex-col gap-2">
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <!-- Nome giocatore già nell'intestazione di sezione
                         quando raggruppato: qui sarebbe ridondante. -->
                    <PlayerTag v-if="!section.player" :name="card.player" />
                    <UTooltip v-if="card.notes" :text="card.notes">
                      <UIcon name="i-lucide-message-circle" class="size-4 text-muted shrink-0" />
                    </UTooltip>
                  </div>
                  <WantedCardsPrices
                    :cardmarket-price="card.cardmarketPrice"
                    :cardtrader-price="card.cardtraderPrice"
                  />
                </div>

                <div class="flex flex-wrap items-center gap-1.5">
                  <UBadge color="neutral" variant="subtle">
                    {{ card.copies }}×
                  </UBadge>
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    :icon="WANTED_CARD_LANGUAGE_ICONS[card.language] ?? 'i-lucide-languages'"
                    class="gap-2"
                  >
                    {{ t(`wantedCard.languages.${card.language || 'any'}`) }}
                  </UBadge>
                  <UBadge
                    v-for="treatment in card.treatment"
                    :key="treatment"
                    color="neutral"
                    variant="subtle"
                  >
                    {{ t(`wantedCard.treatments.${treatment}`) }}
                  </UBadge>
                  <!-- Cluster destro come singolo figlio flex, non due
                       fratelli con `ms-auto` sul primo: con flex-wrap quel
                       margine allinea a destra solo finché la riga non va a
                       capo — dopo, il badge di stato apriva la riga nuova e
                       finiva a sinistra (evidente con l'etichetta più lunga,
                       "Abbandonata"). Da solo sulla riga a capo, invece,
                       `ms-auto` continua a spingere il gruppo a destra. -->
                  <div class="flex items-center gap-1.5 ms-auto shrink-0">
                    <WantedCardsAge :date="card.date" />
                    <UTooltip v-if="showStatus" :text="t(`wantedCard.status.${card.status}`)">
                      <UBadge
                        :color="wantedCardStatusColor(card.status)"
                        variant="subtle"
                        :icon="WANTED_CARD_STATUS_ICONS[card.status]"
                        :aria-label="t(`wantedCard.status.${card.status}`)"
                      />
                    </UTooltip>
                  </div>
                </div>
              </div>
            </template>
          </UCard>
        </UContextMenu>
      </div>
    </div>
  </div>
</template>
