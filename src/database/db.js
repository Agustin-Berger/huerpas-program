const DB_NAME = 'HuerpasProgram'
const DB_VERSION = 2

export const STORES = {
  CLIENTES: 'clientes',
  PRODUCTOS: 'productos',
  PEDIDOS: 'pedidos',
  BORRADORES: 'borradores',
  SEMILLAS: 'semillas',
  VIAJES: 'viajes',
}

let databasePromise

function openDatabase() {
  databasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Cerrá otras pestañas de Huerpas y recargá para actualizar los datos.'))
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => {
        db.close()
        databasePromise = undefined
      }
      resolve(db)
    }
    request.onupgradeneeded = () => {
      const db = request.result
      for (const name of Object.values(STORES)) {
        if (db.objectStoreNames.contains(name)) continue
        const store = db.createObjectStore(name, { keyPath: 'id' })
        if (name === STORES.PRODUCTOS) store.createIndex('codigo', 'codigo')
        if (name === STORES.PEDIDOS) {
          store.createIndex('clienteId', 'clienteId')
          store.createIndex('fecha', 'fecha')
        }
      }
    }
  }).catch((error) => {
    databasePromise = undefined
    throw error
  })
  return databasePromise
}

export async function transaction(names, mode, work) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode)
    let result
    let error
    const fail = (cause) => {
      error = cause
      tx.abort()
    }
    tx.oncomplete = () => resolve(result)
    tx.onabort = () => reject(error ?? tx.error ?? new Error('Se canceló la operación.'))
    try {
      work((name) => tx.objectStore(name), (value) => { result = value }, fail)
    } catch (cause) {
      fail(cause)
    }
  })
}

export function getAllItems(name) {
  return transaction([name], 'readonly', (store, result) => {
    store(name).getAll().onsuccess = (event) => result(event.target.result)
  })
}

export function getItem(name, id) {
  return transaction([name], 'readonly', (store, result) => {
    store(name).get(id).onsuccess = (event) => result(event.target.result)
  })
}

export function saveItem(name, item) {
  return transaction([name], 'readwrite', (store) => store(name).put(item))
}

export function deleteItem(name, id) {
  return transaction([name], 'readwrite', (store) => store(name).delete(id))
}

export function saveOrderAndClearDraft(order, draftId) {
  return transaction([STORES.PEDIDOS, STORES.BORRADORES], 'readwrite', (store) => {
    store(STORES.PEDIDOS).put(order)
    store(STORES.BORRADORES).delete(draftId)
  })
}
