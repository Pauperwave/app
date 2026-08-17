// colada.options.ts
import { PiniaColadaCachePersister } from '@pinia/colada-plugin-cache-persister'
import type { PiniaColadaOptions } from '@pinia/colada'

// Associates carry PII (tax code, address, phone, email) — kept out of the
// localStorage persistence ADR-009 turned on by default for every other query.
// 'user-role' (useUserRole.ts, docs/architecture/roles.md §1) is excluded for
// a different reason: a role fetched for one user must never sit in
// localStorage where a different person logging into the same browser/device
// afterwards could see it, even briefly before refresh() resolves. Must land
// before useUserRole.ts starts calling useQuery, not "alongside" it.
const PERSISTENCE_EXCLUDED_KEYS: string[] = [
  'associates',
  'associate-geocodes',
  'user-role'
]

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
