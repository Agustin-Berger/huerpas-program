import { STORES, getAllItems, transaction } from './db.js'
import { previewCatalog } from '../utils/catalog.js'

export async function readCatalog(file) {
  const parsed = JSON.parse(await file.text())
  if (parsed?.data && Array.isArray(parsed.data.productos)) return parsed.data.productos
  return Array.isArray(parsed) ? parsed : parsed?.productos
}

export function applyCatalog(incoming, baseline) {
  return transaction([STORES.PRODUCTOS], 'readwrite', (store, result, fail) => {
    const products = store(STORES.PRODUCTOS)
    products.getAll().onsuccess = ({ target }) => {
      try {
        if (JSON.stringify(target.result) !== baseline) throw new Error('El catálogo cambió. Volvé a revisar la vista previa.')
        const plan = previewCatalog(target.result, incoming)
        if (plan.conflicts.length) throw new Error(plan.conflicts.join('\n'))
        for (const product of plan.changes) products.put({ ...product, id: product.id ?? crypto.randomUUID() })
        products.getAll().onsuccess = (event) => result(event.target.result)
      } catch (error) {
        fail(error)
      }
    }
  })
}

export async function inspectCatalog(file) {
  const incoming = await readCatalog(file)
  const current = await getAllItems(STORES.PRODUCTOS)
  return { incoming, baseline: JSON.stringify(current), ...previewCatalog(current, incoming) }
}
