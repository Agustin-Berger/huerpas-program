import { STORES, transaction } from './db.js'
import { matchingTrip } from '../utils/tripImport.js'

export function insertImportedTrip(trip, allowCopy) {
  return transaction([STORES.VIAJES], 'readwrite', (store, result, fail) => {
    const trips = store(STORES.VIAJES)
    trips.getAll().onsuccess = ({ target }) => {
      try {
        const duplicate = matchingTrip(target.result, trip.origenPlanilla)
        if (duplicate && !allowCopy) {
          result({ duplicate })
          return
        }
        const withId = (item) => ({ ...item, id: crypto.randomUUID() })
        const saved = withId({
          ...trip,
          filas: trip.filas.map((row) => withId({ ...row, cheques: row.cheques.map(withId) })),
          movimientos: trip.movimientos.map(withId),
        })
        trips.add(saved)
        result({ saved })
      } catch (error) {
        fail(error)
      }
    }
  })
}
