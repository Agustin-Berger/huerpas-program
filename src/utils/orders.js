export const seedGroups = ['Huerta', 'Flores']

export function totalQuantity(entries) {
  return entries.reduce((total, item) => total + Number(item.cantidad), 0)
}

export function seedEntries(item) {
  return item.variedades ?? [{ id: 'surtido', nombre: 'Surtido', cantidad: Number(item.cantidad) }]
}

export function mergeOrderItems(items, selected, seedProductId, makeId = () => crypto.randomUUID()) {
  const updated = [...items]
  for (const entry of selected) {
    const { id: productId, codigo, descripcion, cantidad, variedades } = entry
    const index = updated.findIndex((item) => item.productId === productId)
    const line = { productId, codigo, descripcion, cantidad, aclaracion: '' }
    if (variedades) line.variedades = variedades
    if (index === -1) {
      updated.push({ id: makeId(), ...line })
      continue
    }
    const previous = updated[index]
    const merged = { ...previous, cantidad: Number(previous.cantidad) + cantidad }
    if (productId === seedProductId || variedades || previous.variedades) {
      const details = new Map(seedEntries(previous).map((variety) => [variety.id, variety]))
      for (const variety of seedEntries(line)) {
        const existing = details.get(variety.id)
        details.set(variety.id, existing
          ? { ...existing, cantidad: existing.cantidad + variety.cantidad }
          : variety)
      }
      merged.variedades = [...details.values()]
    }
    updated[index] = merged
  }
  return updated
}
