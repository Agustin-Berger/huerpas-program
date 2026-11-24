import { useEffect, useRef, useState } from 'react'
import Quantity from '../components/Quantity'
import SeedPicker from '../components/SeedPicker'
import { getItem, saveItem, STORES } from '../database/db'
import { normalizeCode, normalizeText, searchProducts } from '../utils/catalog'
import { mergeOrderItems, seedEntries, totalQuantity } from '../utils/orders'

export default function NuevoPedido({ clientes, productos, pedidoEditando, semillas, onSaveOrder, onGoHome, onFinish }) {
  const [client, setClient] = useState(() => pedidoEditando && (
    clientes.find(({ id }) => id === pedidoEditando.clienteId) ?? {
      id: pedidoEditando.clienteId,
      nombre: pedidoEditando.clienteNombre,
      localidad: pedidoEditando.clienteLocalidad,
    }
  ))
  const [search, setSearch] = useState('')
  const filtered = clientes.filter((item) => normalizeText([item.nombre, item.localidad, item.direccion, item.zona].join(' ')).includes(normalizeText(search)))

  if (client) return <OrderDraft key={client.id} {...{
    client, productos, pedidoEditando, semillas, onSaveOrder, onGoHome, onFinish,
    onChangeClient: pedidoEditando ? undefined : () => setClient(null),
  }} />
  return <main className="page">
    <header className="page-header"><button className="home-button" onClick={onGoHome}>← Inicio</button><h1>Nuevo pedido</h1></header>
    <section className="select-client-heading"><h2>Seleccioná un cliente</h2></section>
    <input className="search-input" type="search" placeholder="Buscar por nombre, localidad o zona" aria-label="Buscar cliente"
      value={search} onChange={(event) => setSearch(event.target.value)} />
    <section className="order-client-list">
      {filtered.length === 0 && <p>{clientes.length ? 'No encontramos clientes.' : 'Primero agregá un cliente desde Clientes.'}</p>}
      {filtered.map((item) => <button className="select-client-card" key={item.id} onClick={() => setClient(item)}>
        <div><strong>{item.nombre}</strong><span>{item.localidad}</span><small>{item.zona}</small></div>
        <span className="select-client-arrow">›</span>
      </button>)}
    </section>
  </main>
}

function OrderDraft({ client, productos, pedidoEditando, semillas, onSaveOrder, onGoHome, onFinish, onChangeClient }) {
  const draftId = JSON.stringify(pedidoEditando ? ['pedido', pedidoEditando.id, client.id] : ['nuevo', client.id])
  const [draft, setDraft] = useState(null)
  const current = useRef(null)
  const queue = useRef(Promise.resolve())
  const locked = useRef(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [review, setReview] = useState(false)
  const [editing, setEditing] = useState(null)
  const [picker, setPicker] = useState(null)
  const seedProductId = semillas.find(({ id }) => id === 'producto')?.productId
  const varieties = semillas.filter(({ id, reemplazadaPor }) => id !== 'producto' && !reemplazadaPor)

  useEffect(() => {
    let active = true
    getItem(STORES.BORRADORES, draftId).then((saved) => {
      if (!active) return
      current.current = saved ?? {
        id: draftId,
        orderId: pedidoEditando?.id ?? crypto.randomUUID(),
        selected: [],
        items: pedidoEditando?.productos ?? [],
        observation: pedidoEditando?.observacionGeneral ?? '',
      }
      setDraft(current.current)
    }).catch((error) => { if (active) setStatus(error.message) })
    return () => { active = false }
  }, [draftId, pedidoEditando])

  function update(patch) {
    if (locked.current) return
    const next = { ...current.current, ...patch }
    current.current = next
    setDraft(next)
    setStatus('Guardando borrador…')
    queue.current = queue.current.then(async () => {
      try {
        await saveItem(STORES.BORRADORES, next)
        if (current.current === next) setStatus('Borrador guardado.')
      } catch (error) {
        if (current.current === next) setStatus(`No se guardó el borrador. ${error.message}`)

      }
    })
  }

  async function persist(action) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    try {
      await queue.current
      await action()
    } catch (error) {
      setStatus(`No se guardaron los cambios. ${error.message}`)
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  function select(product, cantidad, details) {
    const selected = current.current.selected.filter(({ id }) => id !== product.id)
    if (cantidad > 0) {
      const { id, codigo, descripcion } = product
      selected.push({ id, codigo, descripcion, cantidad, ...(details && { variedades: details }) })
    }
    update({ selected })
  }

  function chosen(product) {
    return draft.selected.find(({ id }) => id === product.id)
  }

  function openProduct(product) {
    const entry = chosen(product)
    if (product.id === seedProductId || entry?.variedades) {
      setPicker({ product, initial: entry ? seedEntries(entry) : [] })
    } else if (!entry) select(product, 1)
  }

  async function addBatch() {
    await persist(async () => {
      const base = current.current
      if (!base.selected.length) return
      const next = { ...base, selected: [], items: mergeOrderItems(base.items, base.selected, seedProductId) }
      await saveItem(STORES.BORRADORES, next)
      current.current = next
      setDraft(next)
      setReview(false)
      setStatus('Selección agregada al borrador.')
    })
  }

  async function saveOrder() {
    await persist(async () => {
      const { items, orderId, observation, selected } = current.current
      if (editing || picker || !items.length || selected.length) {
        setStatus('Terminá la edición, agregá o limpiá la selección y cargá al menos un producto.')
        return
      }
      const now = new Date().toISOString()
      await onSaveOrder({
        ...pedidoEditando,
        id: orderId,
        clienteId: client.id,
        clienteNombre: client.nombre,
        clienteLocalidad: client.localidad ?? '',
        fecha: pedidoEditando?.fecha ?? now,
        fechaEdicion: pedidoEditando ? now : null,
        productos: items,
        observacionGeneral: observation.trim(),
        estado: pedidoEditando ? 'editado' : 'no-leido',
        editado: Boolean(pedidoEditando),
      }, draftId)
      onFinish()
    })
  }

  function leave(go) {
    if (!draft) { go(); return }
    void persist(async () => {
      await saveItem(STORES.BORRADORES, current.current)
      go()
    })
  }

  const hasSearch = Boolean(search.trim())
  const results = hasSearch ? searchProducts(productos, search) : []
  const visible = review ? draft?.selected ?? [] : results
  const emptyMessage = review
    ? 'La selección está vacía.'
    : hasSearch ? 'No encontramos productos.' : 'Ingresá un código o descripción para buscar artículos'

  return <main className="page order-workspace">
    <header className="page-header">
      <button className="home-button" disabled={busy} onClick={() => leave(onGoHome)}>← Inicio</button>
      <h1>{pedidoEditando ? 'Editar pedido' : 'Nuevo pedido'}</h1>
    </header>
    <section className="selected-client-card">
      <div><h2>{client.nombre}</h2><p>{client.localidad}</p><small>{client.zona}</small></div>
      {onChangeClient && <button className="change-client-button" disabled={busy} onClick={() => leave(onChangeClient)}>Cambiar cliente</button>}
    </section>
    <p role="status" className="local-status">{status || (!draft ? 'Cargando borrador…' : '')}</p>
    {draft && <fieldset className="plain-fields" disabled={busy}>
      {picker ? <SeedPicker varieties={varieties} initial={picker.initial} onCancel={() => setPicker(null)} onConfirm={(details) => {
        if (picker.line) setEditing({ ...editing, variedades: details, cantidad: totalQuantity(details) })
        else select(picker.product, totalQuantity(details), details)
        setPicker(null)
      }} /> : <section className="product-entry">
        <h2>{review ? 'Revisar selección' : 'Productos'}</h2>
        {!review && <input className="search-input" type="search" aria-label="Buscar producto" placeholder="Buscar por código o descripción"
          value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            const exact = results.filter((item) => normalizeCode(item.codigo) === normalizeCode(search))
            if (exact.length === 1 && normalizeCode(search)) openProduct(exact[0])
          }} />}
        <div className="selection-grid">
          {visible.map((product) => {
            const entry = chosen(product)
            const special = product.id === seedProductId || Boolean(entry?.variedades)
            return <article key={product.id} className={`selection-card ${entry ? 'chosen' : ''}`}>
              <button className="product-name" onClick={() => openProduct(product)} aria-pressed={Boolean(entry)}>
                <strong>{product.codigo}</strong><span>{product.descripcion}</span>
              </button>
              {special
                ? <button className="edit-button" onClick={() => openProduct(product)}>Variedades · {entry?.cantidad ?? 0}</button>
                : <Quantity label={String(product.codigo)} value={entry?.cantidad ?? 0} onChange={(value) => select(product, value)} />}
            </article>
          })}
        </div>
        {visible.length === 0 && <p>{emptyMessage}</p>}
      </section>}
      <section className="order-summary">
        <div className="order-summary-heading"><h2>Productos del pedido</h2><span>{draft.items.length}</span></div>
        {draft.items.map((item) => <article className="order-item" key={item.id}>
          {editing?.id === item.id ? <div className="order-item-information">
            <strong>{item.codigo} — {item.descripcion}</strong>
            {editing.variedades || item.productId === seedProductId
              ? <button className="edit-button" onClick={() => setPicker({ line: true, initial: seedEntries(editing) })}>Editar variedades · {editing.cantidad}</button>
              : <Quantity label={String(item.codigo)} min={1} value={editing.cantidad} onChange={(cantidad) => setEditing({ ...editing, cantidad })} />}
            <label className="clarification-field">Aclaración<textarea value={editing.aclaracion ?? ''} onChange={(event) => setEditing({ ...editing, aclaracion: event.target.value })} /></label>
            <div className="product-form-actions">
              <button className="cancel-edit-button" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="add-product-button" disabled={!editing.cantidad || Boolean(picker)} onClick={() => {
                update({ items: draft.items.map((line) => line.id === item.id ? editing : line) })
                setEditing(null)
              }}>Guardar línea</button>
            </div>
          </div> : <>
            <div className="order-item-information">
              <strong>{item.codigo} — {item.descripcion}</strong>
              <span>Cantidad {item.cantidad}</span>
              {item.aclaracion && <small>{item.aclaracion}</small>}
              {item.variedades?.map((variety) => <small key={variety.id}>{variety.nombre} · {variety.cantidad}</small>)}
            </div>
            <div className="order-item-actions">
              <button disabled={Boolean(editing || picker)} onClick={() => setEditing({ ...item, cantidad: Number(item.cantidad) })}>Editar</button>
              <button disabled={Boolean(editing || picker)} aria-label={`Eliminar ${item.descripcion}`} onClick={() => {
                if (window.confirm('¿Querés eliminar esta línea del borrador?')) update({ items: draft.items.filter((line) => line.id !== item.id) })
              }}>×</button>
            </div>
          </>}
        </article>)}
      </section>
      <label className="general-observation">Observación general
        <textarea rows="3" value={draft.observation} onChange={(event) => update({ observation: event.target.value })} />
      </label>
      <button className="save-order-button" onClick={saveOrder} disabled={Boolean(editing || picker)}>Guardar pedido</button>
      {!picker && <section className="selection-bar" aria-label="Selección de productos">
        <strong aria-live="polite">{draft.selected.length} productos · {totalQuantity(draft.selected)} unidades</strong>
        <div className="selection-actions">
          <button className="edit-button" disabled={!review && !draft.selected.length} onClick={() => setReview(!review)}>{review ? 'Volver a productos' : 'Revisar selección'}</button>
          <button className="edit-button" disabled={!draft.selected.length} onClick={() => {
            if (window.confirm('¿Querés limpiar la selección?')) update({ selected: [] })
          }}>Limpiar selección</button>
          <button className="add-product-button" disabled={!draft.selected.length || Boolean(editing)} onClick={addBatch}>Agregar al pedido</button>
        </div>
      </section>}
    </fieldset>}
  </main>
}
