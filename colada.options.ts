// colada.options.ts
import { PiniaColadaCachePersister } from '@pinia/colada-plugin-cache-persister'
import type { PiniaColadaOptions } from '@pinia/colada'

// Associates carry PII (tax code, address, phone, email) — kept out of the
// localStorage persistence ADR-009 turned on by default for every other query.
const PERSISTENCE_EXCLUDED_KEYS: string[] = ['associates', 'associate-geocodes']

export default {
  plugins: [
    PiniaColadaCachePersister({
      key: 'pauperwave-colada-cache',
      filter: {
        predicate: entry => !PERSISTENCE_EXCLUDED_KEYS.includes(String(entry.key[0]))
      }
    })
  ]
} satisfies PiniaColadaOptions
