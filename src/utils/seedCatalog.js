import { normalizeText } from './catalog.js'

export const seedNameKey = (group, name) => `${group}:${normalizeText(name).replace(/\s+/g, ' ')}`

const names = {
  Huerta: [
    'Albahaca', 'Acelga', 'Arvejas', 'Apio', 'Brocoli', 'Berenjena', 'Coliflor', 'Cebolla',
    'Cebolla de verdeo', 'Cilantro', 'Chaucha rolliza', 'Ciboulette', 'Espinaca', 'Escarola',
    'Hinojo', 'Habas', 'Jalapeño', 'L. Crespa', 'L. Criolla', 'L. Capuchina', 'L. Gallega',
    'L. Matecosa', 'L. Morada', 'Maíz', 'Melón', 'Menta', 'Orégano Puerro', 'Perejil Criollo',
    'Perejil Crespo', 'Pimiento', 'Pepino', 'Remolacha', 'Rucula', 'Repollo', 'Rabanito', 'Achicoria',
    'Tomate platense', 'Tomate perita', 'Tomillo', 'Salvia', 'Sandia', 'Zapallo anco',
    'Zapallo gris plomo', 'Zapallito tronco', 'Zucchini', 'Zanahoria',
  ],
  Flores: [
    'Espuela de caballero', 'Phlox', 'Lobelia', 'Rayito de sol', 'Taco de reina', 'Alegría del hogar',
    'Aliso', 'Arvejilla', 'Clavelina', 'Caléndula', 'Clavel', 'Coqueta', 'Copete', 'Cosmos',
    'Conejito enano', 'Dama de noche', 'Dimorfoteca', 'Pensamiento Penacho', 'Ruda macho',
    'Rudbeckia', 'Portulaca', 'Zinnia', 'Salvia coral', 'Siempreviva', 'Viola cornuta', 'Aleli de mahon',
  ],
}

export const seedDefaults = Object.entries(names).flatMap(([grupo, entries]) => entries.map((nombre) => {
  const id = `catalogo-semillas:${seedNameKey(grupo, nombre)}`
  return { id, catalogoId: id, grupo, nombre, activa: true }
}))

export function seedCatalogChanges(records) {
  const byId = new Map(records.map((item) => [item.id, item]))
  const byName = new Map()
  const linked = new Map()
  for (const item of records) {
    if (!item.nombre || item.reemplazadaPor) continue
    if (item.catalogoId && item.id !== item.catalogoId) linked.set(item.catalogoId, item)
    const nameKey = seedNameKey(item.grupo, item.nombre)
    // Prefer existing custom records when a pre-seed backup is incorporated.
    if (!byName.has(nameKey) || !item.id.toString().startsWith('catalogo-semillas:')) byName.set(nameKey, item)
  }
  const changes = []
  for (const entry of seedDefaults) {
    const canonical = byId.get(entry.id)
    const existing = linked.get(entry.id)
    const match = byName.get(seedNameKey(entry.grupo, entry.nombre))
    const alternate = existing ?? (match?.catalogoId ? undefined : match)
    if (!canonical) {
      if (existing) continue
      if (!match) changes.push(entry)
      else if (!match.catalogoId) changes.push({ ...match, catalogoId: entry.id })
    } else if (alternate && alternate.id !== canonical.id && !canonical.reemplazadaPor) {
      const pristine = canonical.activa && canonical.nombre === entry.nombre && canonical.grupo === entry.grupo
      if (pristine) {
        // Keep the old ID available to saved orders and list the restored variety instead.
        changes.push({ ...canonical, reemplazadaPor: alternate.id })
        if (!existing) changes.push({ ...alternate, catalogoId: entry.id })
      } else if (seedNameKey(alternate.grupo, alternate.nombre) === seedNameKey(canonical.grupo, canonical.nombre)) {
        changes.push({ ...alternate, reemplazadaPor: canonical.id })
      }
    }
  }
  return changes
}
