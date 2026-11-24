import { STORES, transaction } from './db.js'
import { applySeedCatalog } from './seeds.js'
import { downloadJson } from '../utils/downloadJson.js'

const names = Object.values(STORES)
const required = [STORES.CLIENTES, STORES.PRODUCTOS, STORES.PEDIDOS]

export function readBackupData() {
  return transaction(names, 'readonly', (store, result) => {
    const data = {}
    result(data)
    for (const name of names) {
      store(name).getAll().onsuccess = (event) => { data[name] = event.target.result }
    }
  })
}

export async function exportBackup() {
  const now = new Date()
  const backup = { version: 2, generatedAt: now.toISOString(), data: await readBackupData() }
  downloadJson(backup, 'Huerpas_Backup_' + new Intl.DateTimeFormat('sv-SE').format(now) + '.json')
}

export function validateBackup(backup) {
  const data = backup?.data
  if (!data || !required.every((name) => Array.isArray(data[name]))) {
    throw new Error('El respaldo está incompleto o dañado.')
  }
  for (const name of names) {
    if (!(name in data)) continue
    if (!Array.isArray(data[name])) throw new Error(`Datos inválidos en ${name}.`)
    const ids = new Set()
    for (const item of data[name]) {
      const id = item?.id
      if ((!Number.isSafeInteger(id) && !(typeof id === 'string' && id.trim())) || ids.has(id)) {
        throw new Error(`ID inválido o duplicado en ${name}.`)
      }
      ids.add(id)
    }
  }
  return data
}

export function restoreBackup(data) {
  return transaction(names, 'readwrite', (store, result, fail) => {
    const merged = {}
    result(merged)
    for (const name of names) {
      const target = store(name)
      for (const item of data[name] ?? []) {
        target.get(item.id).onsuccess = (event) => {
          target.put({ ...event.target.result, ...item })
        }
      }
    }
    // Read after all queued lookups have had a chance to enqueue their writes.
    store(STORES.CLIENTES).count().onsuccess = () => {
      for (const name of names) {
        const target = store(name)
        target.getAll().onsuccess = (event) => {
          try {
            merged[name] = name === STORES.SEMILLAS ? applySeedCatalog(target, event.target.result) : event.target.result
          } catch (error) {
            fail(error)
          }
        }
      }
    }
  })
}

export async function readBackup(file) {
  let backup
  try {
    backup = JSON.parse(await file.text())
  } catch {
    throw new Error('El archivo seleccionado no es un JSON válido.')
  }
  return validateBackup(backup)
}
