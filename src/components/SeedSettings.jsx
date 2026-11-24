import { useState } from 'react'
import { getAllItems, saveItem, STORES } from '../database/db'
import { seedGroups } from '../utils/orders'
import { seedNameKey } from '../utils/seedCatalog'

const empty = { nombre: '', grupo: 'Huerta', activa: true }

export default function SeedSettings({ productos, records, onChange }) {
  const [form, setForm] = useState(empty)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const varieties = records.filter(({ id, reemplazadaPor }) => id !== 'producto' && !reemplazadaPor)
  const config = records.find(({ id }) => id === 'producto')
  const options = [...productos].sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'es-AR', { numeric: true }))

  async function store(record, afterSave) {
    setBusy(true)
    try {
      await saveItem(STORES.SEMILLAS, record)
      onChange(await getAllItems(STORES.SEMILLAS))
      setStatus('Configuración guardada.')
      afterSave?.()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setBusy(false)
    }
  }

  return <section className="backup-section">
    <h2>Semillas</h2>
    <fieldset disabled={busy} className="plain-fields">
      <label>Producto de sobres de semillas
        <select value={config?.productId == null ? '' : JSON.stringify(config.productId)}
          onChange={({ target }) => store({ id: 'producto', productId: target.value ? JSON.parse(target.value) : null })}>
          <option value="">Elegir código del catálogo</option>
          {config?.productId != null && !options.some(({ id }) => id === config.productId) &&
            <option value={JSON.stringify(config.productId)}>Producto fuera del catálogo</option>}
          {options.map((item) => <option key={item.id} value={JSON.stringify(item.id)}>{item.codigo} — {item.descripcion}</option>)}
        </select>
      </label>
      <form className="client-form" onSubmit={(event) => {
        event.preventDefault()
        const nombre = form.nombre.trim()
        if (!nombre) return
        if (varieties.some((entry) => entry.id !== form.id && seedNameKey(entry.grupo, entry.nombre) === seedNameKey(form.grupo, nombre))) {
          setStatus('Ya existe una variedad con ese nombre en este grupo. Podés editarla o activarla.')
          return
        }
        store({ ...form, nombre, id: form.id ?? crypto.randomUUID() }, () => setForm(empty))
      }}>
        <label>Nombre de la variedad
          <input required value={form.nombre} onChange={({ target }) => setForm({ ...form, nombre: target.value })} />
        </label>
        <label>Grupo
          <select value={form.grupo} onChange={({ target }) => setForm({ ...form, grupo: target.value })}>
            {seedGroups.map((group) => <option key={group}>{group}</option>)}
          </select>
        </label>
        <button className="save-button">{form.id ? 'Guardar cambios' : 'Agregar variedad'}</button>
        {form.id && <button type="button" className="backup-secondary-button" onClick={() => setForm(empty)}>Cancelar edición</button>}
      </form>
      {[...varieties].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-AR')).map((item) =>
        <div className="order-item" key={item.id}>
          <div className="order-item-information"><strong>{item.nombre}</strong><small>{item.grupo} · {item.activa ? 'Activa' : 'Inactiva'}</small></div>
          <button className="edit-button" onClick={() => setForm(item)}>Editar</button>
          <button className="edit-button" onClick={() => store({ ...item, activa: !item.activa }, () => {
            if (form.id === item.id) setForm(empty)
          })}>{item.activa ? 'Desactivar' : 'Activar'}</button>
        </div>)}
    </fieldset>
    <p role="status">{status}</p>
  </section>
}
