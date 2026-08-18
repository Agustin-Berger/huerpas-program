const DB_NAME = 'HuerpasProgram'
const DB_VERSION = 1

export const STORES = {
  CLIENTES: 'clientes',
  PRODUCTOS: 'productos',
  PEDIDOS: 'pedidos',
}

let databasePromise = null

function openDatabase() {
  if (databasePromise) {
    return databasePromise
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORES.CLIENTES)) {
        db.createObjectStore(STORES.CLIENTES, {
          keyPath: 'id',
        })
      }

      if (!db.objectStoreNames.contains(STORES.PRODUCTOS)) {
        const productosStore = db.createObjectStore(
          STORES.PRODUCTOS,
          {
            keyPath: 'id',
          },
        )

        productosStore.createIndex(
          'codigo',
          'codigo',
          {
            unique: false,
          },
        )
      }

      if (!db.objectStoreNames.contains(STORES.PEDIDOS)) {
        const pedidosStore = db.createObjectStore(
          STORES.PEDIDOS,
          {
            keyPath: 'id',
          },
        )

        pedidosStore.createIndex(
          'clienteId',
          'clienteId',
          {
            unique: false,
          },
        )

        pedidosStore.createIndex(
          'fecha',
          'fecha',
          {
            unique: false,
          },
        )
      }
    }
  })

  return databasePromise
}

export async function getAllItems(storeName) {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      storeName,
      'readonly',
    )

    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function saveItem(storeName, item) {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      storeName,
      'readwrite',
    )

    const store = transaction.objectStore(storeName)

    store.put(item)

    transaction.oncomplete = () => {
      resolve()
    }

    transaction.onerror = () => {
      reject(transaction.error)
    }
  })
}

export async function deleteItem(storeName, id) {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      storeName,
      'readwrite',
    )

    const store = transaction.objectStore(storeName)

    store.delete(id)

    transaction.oncomplete = () => {
      resolve()
    }

    transaction.onerror = () => {
      reject(transaction.error)
    }
  })
}

export async function migrateLocalStorageToIndexedDB() {
  const migrationDone =
    localStorage.getItem(
      'huerpas-indexeddb-migration',
    ) === 'true'

  if (migrationDone) {
    return
  }

  const legacyData = [
    {
      store: STORES.CLIENTES,
      key: 'huerpas-clientes',
    },
    {
      store: STORES.PRODUCTOS,
      key: 'huerpas-productos',
    },
    {
      store: STORES.PEDIDOS,
      key: 'huerpas-pedidos',
    },
  ]

  for (const item of legacyData) {
    const existingItems = await getAllItems(item.store)

    if (existingItems.length > 0) {
      continue
    }

    const rawData = localStorage.getItem(item.key)

    if (!rawData) {
      continue
    }

    try {
      const parsedData = JSON.parse(rawData)

      for (const record of parsedData) {
        await saveItem(item.store, record)
      }
    } catch (error) {
      console.error(
        `No se pudo migrar ${item.store}:`,
        error,
      )
    }
  }

  localStorage.setItem(
    'huerpas-indexeddb-migration',
    'true',
  )
}