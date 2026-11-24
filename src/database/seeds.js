import { STORES, transaction } from './db.js'
import { seedCatalogChanges } from '../utils/seedCatalog.js'

export function applySeedCatalog(store, existing) {
  const records = new Map(existing.map((entry) => [entry.id, entry]))
  for (const change of seedCatalogChanges(existing)) {
    store.put(change)
    records.set(change.id, change)
  }
  return [...records.values()]
}

export function initializeSeedCatalog() {
  return transaction([STORES.SEMILLAS], 'readwrite', (store, result, fail) => {
    const seeds = store(STORES.SEMILLAS)
    seeds.getAll().onsuccess = ({ target }) => {
      try {
        result(applySeedCatalog(seeds, target.result))
      } catch (error) {
        fail(error)
      }
    }
  })
}
