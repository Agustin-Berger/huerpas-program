export function normalizeText(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

export function normalizeCode(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function searchProducts(products, query) {
  const code = normalizeCode(query)
  if (!code) return products
  const terms = normalizeText(query).split(/\s+/)
  const numeric = /^\d+$/.test(code)
  return products.flatMap((product) => {
    const key = normalizeCode(product.codigo)
    if (key === code) return [{ product, rank: 0 }]
    if (numeric) {
      if (key.startsWith(code)) return [{ product, rank: 1 }]
      return key.includes(code) ? [{ product, rank: 2 }] : []
    }
    const description = normalizeText(product.descripcion)
    return terms.every((term) => description.includes(term)) ? [{ product, rank: 1 }] : []
  }).sort((a, b) => a.rank - b.rank).map(({ product }) => product)
}

export function previewCatalog(current, incoming) {
  if (!Array.isArray(incoming)) throw new Error('Elegí un JSON con una lista de productos.')
  const previous = new Map()
  for (const product of current) {
    const code = normalizeCode(product.codigo)
    previous.set(code, [...(previous.get(code) ?? []), product])
  }
  const counts = { nuevos: 0, modificados: 0, 'sin cambios': 0, conservados: 0 }
  const conflicts = []
  const changes = []
  const seen = new Set()
  const reassignedIds = []
  const ids = new Set(current.map(({ id }) => id))
  const incomingIds = new Set()
  incoming.forEach((row, index) => {
    const rawCode = row?.codigo
    const code = normalizeCode(rawCode)
    const label = `Fila ${index + 1}`
    if (!code || !(typeof rawCode === 'string' || Number.isSafeInteger(rawCode))) {
      conflicts.push(`${label}: código vacío o inválido.`)
      return
    }
    if (seen.has(code) || (previous.get(code)?.length ?? 0) > 1) {
      conflicts.push(`${label}: código duplicado ${rawCode}.`)
      return
    }
    seen.add(code)
    const validId = (typeof row.id === 'string' && row.id.trim()) || Number.isSafeInteger(row.id)
    if (validId && incomingIds.has(row.id)) {
      conflicts.push(label + ': ID repetido en el archivo.')
      return
    }
    if (validId) incomingIds.add(row.id)
    const existing = previous.get(code)?.[0]
    const description = row.descripcion
    if ((description !== undefined || !existing) && (typeof description !== 'string' || !description.trim())) {
      conflicts.push(`${label}: descripción vacía o inválida.`)
      return
    }
    if (existing) {
      if (description === undefined || existing.descripcion === description.trim()) counts['sin cambios']++
      else {
        counts.modificados++
        changes.push({ ...existing, descripcion: description.trim() })
      }
      return
    }
    const keepId = validId && !ids.has(row.id)
    if (validId && !keepId) reassignedIds.push(String(rawCode))
    if (keepId) ids.add(row.id)
    counts.nuevos++
    changes.push({ ...row, id: keepId ? row.id : undefined, codigo: String(rawCode).trim(), descripcion: description.trim() })
  })
  counts.conservados = current.filter((product) => !seen.has(normalizeCode(product.codigo))).length
  return { counts, conflicts, changes, reassignedIds }
}
