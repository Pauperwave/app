// colada.options.ts
import { PiniaColadaCachePersister } from '@pinia/colada-plugin-cache-persister'
import type { PiniaColadaOptions } from '@pinia/colada'

export default {
  plugins: [
    PiniaColadaCachePersister({
      key: 'pauperwave-colada-cache'
    })
  ]
} satisfies PiniaColadaOptions
