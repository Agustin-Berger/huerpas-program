import { useState } from 'react'
import Quantity from './Quantity'
import { normalizeText } from '../utils/catalog'
import { seedGroups, totalQuantity } from '../utils/orders'

const assortment = { id: 'surtido', nombre: 'Surtido sin variedad específica' }

export default function SeedPicker({ varieties, initial, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(() => new Map(initial.map((item) => [item.id, item])))
  const [search, setSearch] = useState('')
  const options = new Map(varieties.filter((item) => item.activa || selected.has(item.id)).map((item) => [item.id, item]))
  for (const [id, item] of selected) if (!options.has(id)) options.set(id, item)
  const visible = [...options.values()]
    .filter((item) => normalizeText(item.nombre).includes(normalizeText(search)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-AR'))
  const details = [...selected.values()]
  function card(item) {
    const value = selected.get(item.id)?.cantidad ?? 0
    return <article className={`selection-card ${value ? 'chosen' : ''}`} key={item.id}>
      <strong>{item.nombre}</strong>
      <Quantity label={item.nombre} value={value} onChange={(cantidad) => {
        setSelected((previous) => {
          const next = new Map(previous)
          if (cantidad) next.set(item.id, { ...item, ...previous.get(item.id), cantidad })
          else next.delete(item.id)
          return next
        })
      }} />
    </article>
  }
  return <section className="product-entry" aria-label="Selector de variedades">
    <h2>Variedades de semillas</h2>
    <input className="search-input" type="search" aria-label="Buscar variedad" placeholder="Buscar variedad"
      value={search} onChange={(event) => setSearch(event.target.value)} />
    <div className="selection-grid">{card(assortment)}</div>
    {[...seedGroups, 'Otras'].map((group) => {
      const rows = visible.filter((item) => item.id !== assortment.id && (item.grupo ?? 'Otras') === group)
      return rows.length > 0 && <section key={group}><h3>{group}</h3><div className="selection-grid">{rows.map(card)}</div></section>
    })}
    {varieties.length === 0 && <p>Podés cargar las variedades desde Más → Semillas.</p>}
    <p aria-live="polite">{totalQuantity(details)} sobres</p>
    <div className="product-form-actions">
      <button className="cancel-edit-button" onClick={onCancel}>Cancelar</button>
      <button className="add-product-button" onClick={() => onConfirm(details)}>Confirmar variedades</button>
    </div>
  </section>
}
