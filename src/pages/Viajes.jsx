import { useEffect, useRef, useState } from 'react'
import { deleteItem, getAllItems, getItem, saveItem, STORES, transaction } from '../database/db'
import TripImport from '../components/TripImport'
import { exportTripPdf } from '../utils/generateTripPdf'
import {
  formatMoney, formatPreviousBalance, methods, moneyInput, movementTypes, parseMoney, paymentFields, rowTotals, showPending, tripTotalEntries,
} from '../utils/trips'

const editorId = 'viaje-editor'
const today = () => new Intl.DateTimeFormat('sv-SE').format(new Date())
const blankTrip = () => ({ destino: '', detalleCarga: '', fecha: today(), efectivoInicial: 0, filas: [], movimientos: [], archivado: false })
const blankRow = { cliente: '', clienteId: null, localidad: null, bultos: '', carga: '', facturado: 0, saldoAnterior: null, efectivo: 0, transferencia: 0, cheques: [], observaciones: '' }
const blankMovement = (fecha) => ({ fecha, tipo: 'Gasto', concepto: '', importe: 0, medio: 'Efectivo', observacion: '' })

function field(label, value, onChange, options = {}) {
  return <label key={options.name ?? label}>{label}<input {...options} value={value ?? ''} onChange={({ target }) => onChange(target.value)} /></label>
}

function optionField(label, value, options, onChange) {
  return <label>{label}<select value={value} onChange={({ target }) => onChange(target.value)}>
    {options.map((option) => <option key={option}>{option}</option>)}
  </select></label>
}

function changed(list, item) {
  return item.id ? list.map((value) => value.id === item.id ? item : value) : [...list, { ...item, id: crypto.randomUUID() }]
}

export default function Viajes({ clientes, onGoHome }) {
  const [trips, setTrips] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [tab, setTab] = useState('filas')
  const [editor, setEditor] = useState(null)
  const [archived, setArchived] = useState(false)
  const [status, setStatus] = useState('Cargando viajes…')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const guard = useRef(false)
  const editorWrites = useRef(Promise.resolve())
  const active = trips.find(({ id }) => id === activeId)

  useEffect(() => {
    let alive = true
    Promise.all([getAllItems(STORES.VIAJES), getItem(STORES.BORRADORES, editorId)]).then(([records, saved]) => {
      if (!alive) return
      setTrips(records)
      setLoaded(true)
      if (saved && (!saved.activeId || records.some(({ id }) => id === saved.activeId))) {
        setActiveId(saved.activeId)
        setTab(saved.tab)
        setEditor(saved.editor)
        setStatus('Borrador recuperado.')
      } else setStatus('')
    }).catch((error) => { if (alive) setStatus(error.message) })
    return () => { alive = false }
  }, [])

  async function store(trip, closeDraft = false) {
    if (guard.current) return false
    guard.current = true
    setBusy(true)
    setStatus('Guardando…')
    try {
      if (closeDraft) {
        await editorWrites.current
        await transaction([STORES.VIAJES, STORES.BORRADORES], 'readwrite', (st) => {
          st(STORES.VIAJES).put(trip)
          st(STORES.BORRADORES).delete(editorId)
        })
      } else await saveItem(STORES.VIAJES, trip)
      setTrips((previous) => previous.some(({ id }) => id === trip.id)
        ? previous.map((item) => item.id === trip.id ? trip : item)
        : [...previous, trip])
      setStatus('Guardado en este dispositivo.')
      return true
    } catch (error) {
      setStatus(`No se guardaron los cambios. ${error.message}`)
      return false
    } finally {
      setBusy(false)
      guard.current = false
    }
  }

  async function closeEditor() {
    if (guard.current || (editor.dirty && !window.confirm('¿Descartar los cambios de este editor?'))) return
    guard.current = true
    setBusy(true)
    try {
      await editorWrites.current
      await deleteItem(STORES.BORRADORES, editorId)
      setEditor(null)
      setStatus('')
    } catch (error) {
      setStatus(error.message)
    } finally {
      guard.current = false
      setBusy(false)
    }
  }

  function updateEditor(next) {
    if (guard.current) return
    setEditor(next)
    setStatus('Guardando borrador…')
    editorWrites.current = editorWrites.current.then(async () => {
      try {
        await saveItem(STORES.BORRADORES, { id: editorId, activeId, tab, editor: next })
        setStatus('Borrador guardado en este dispositivo.')
      } catch (error) {
        setStatus('No se guardó el borrador. ' + error.message)
      }
    })
  }

  async function remove(collection, id) {
    if (window.confirm('¿Querés eliminar este registro del viaje?')) {
      await store({ ...active, [collection]: active[collection].filter((item) => item.id !== id) })
    }
  }

  function open(kind, item) {
    const moneyFields = kind === 'trip' ? ['efectivoInicial'] : kind === 'filas' ? Object.keys(paymentFields) : ['importe']
    const value = { ...item }
    for (const key of moneyFields) {
      value[key] = key === 'saldoAnterior' && item[key] === 0 ? '0' : moneyInput(item[key])
    }
    if (kind === 'filas') value.cheques = item.cheques.map((check) => ({ ...check, importe: moneyInput(check.importe) }))
    setEditor({ kind, value, moneyFields })
    setStatus('')
  }

  function edit(key, value) {
    updateEditor({ ...editor, dirty: true, value: { ...editor.value, [key]: value } })
  }

  async function apply(event) {
    event.preventDefault()
    const { kind, value, moneyFields } = editor
    const record = { ...value }
    const unknownBalance = kind === 'filas' && !String(value.saldoAnterior ?? '').trim()
    for (const key of moneyFields) record[key] = parseMoney(record[key], key === 'saldoAnterior')
    if (moneyFields.some((key) => record[key] === null)) { setStatus('Revisá los importes. Usá hasta dos decimales.'); return }
    if (unknownBalance) record.saldoAnterior = null
    if (kind === 'trip') {
      record.destino = record.destino.trim()
      if (!record.destino || !record.fecha) { setStatus('Ingresá destino y fecha.'); return }
      record.id ??= crypto.randomUUID()
      if (await store(record, true)) { setActiveId(record.id); setEditor(null) }
      return
    }
    if (kind === 'filas') {
      record.cliente = record.cliente.trim()
      record.bultos = String(record.bultos ?? '')
      record.localidad = record.localidad?.trim() || null
      record.cheques = record.cheques.map((item) => ({ ...item, numero: item.numero.trim(), importe: parseMoney(item.importe) }))
      if (!record.cliente ||
          record.cheques.some((check) => !check.numero || !(check.importe > 0))) {
        setStatus('Revisá el cliente y el número e importe de cada cheque.')
        return
      }
    } else {
      record.concepto = record.concepto.trim()
      if (!record.concepto || !record.fecha || record.importe <= 0) { setStatus('Ingresá fecha, concepto e importe positivo.'); return }
    }
    if (await store({ ...active, [kind]: changed(active[kind], record) }, true)) setEditor(null)
  }

  function renderEditor() {
    const { kind, value } = editor
    const bind = (label, key, options) => field(label, value[key], (entry) => edit(key, entry), options)
    const numeric = { inputMode: 'decimal', placeholder: '0,00' }
    return <form className="client-form trip-editor" onSubmit={apply}>
      <fieldset disabled={busy} className="plain-fields">
        <h2>{kind === 'trip' ? 'Datos del viaje' : kind === 'filas' ? 'Fila de reparto' : 'Movimiento de caja'}</h2>
        {kind === 'trip' && <>
          {bind('Destino o zona', 'destino', { required: true })}
          {bind('Fecha', 'fecha', { type: 'date', required: true })}
          {bind('Detalle general de carga', 'detalleCarga')}
          {bind('Efectivo inicial', 'efectivoInicial', numeric)}
        </>}
        {kind === 'filas' && <>
          <label>Cliente del catálogo
            <select value={value.clienteId == null ? '' : JSON.stringify(value.clienteId)} onChange={({ target }) => {
              const client = target.value ? clientes.find(({ id }) => id === JSON.parse(target.value)) : null
              updateEditor({ ...editor, dirty: true, value: { ...value, clienteId: client?.id ?? null, cliente: value.clienteOriginal ? value.cliente : client?.nombre ?? value.cliente } })
            }}>
              <option value="">Ingresar cliente manualmente</option>
              {value.clienteId != null && !clientes.some(({ id }) => id === value.clienteId) &&
                <option value={JSON.stringify(value.clienteId)}>{value.cliente} (fuera del catálogo)</option>}
              {clientes.map((client) => <option key={client.id} value={JSON.stringify(client.id)}>{client.nombre} {client.localidad}</option>)}
            </select>
          </label>
          {bind('Nombre en planilla', 'cliente', { required: true })}
          {value.clienteOriginal && value.clienteOriginal !== value.cliente && <p>Nombre del archivo: {value.clienteOriginal}</p>}
          {bind('Localidad', 'localidad')}
          {bind('Bultos', 'bultos', { placeholder: 'Ej. 1.B + mangueras' })}
          {bind('Aclaraciones de carga', 'carga')}
          <div className="payment-fields">
            {Object.entries(paymentFields).map(([key, label]) => bind(label, key, key === 'saldoAnterior'
              ? { ...numeric, placeholder: 'Desconocido si queda vacío' } : numeric))}
          </div>
          <h3>Cheques</h3>
          {value.cheques.map((check) => <div className="check-fields" key={check.id}>
            {field('Número de cheque', check.numero, (numero) => edit('cheques', value.cheques.map((item) => item.id === check.id ? { ...item, numero } : item)), { required: true })}
            {field('Importe del cheque', check.importe, (importe) => edit('cheques', value.cheques.map((item) => item.id === check.id ? { ...item, importe } : item)), { ...numeric, required: true })}
            <button className="delete-button" type="button" aria-label="Eliminar cheque" onClick={() => {
              if (window.confirm('¿Querés eliminar este cheque?')) edit('cheques', value.cheques.filter(({ id }) => id !== check.id))
            }}>×</button>
          </div>)}
          <button type="button" className="edit-button" onClick={() => edit('cheques', [...value.cheques, { id: crypto.randomUUID(), numero: '', importe: '' }])}>Agregar cheque</button>
          {bind('Observaciones', 'observaciones')}
        </>}
        {kind === 'movimientos' && <>
          {bind('Fecha', 'fecha', { type: 'date', required: true })}
          {optionField('Tipo de movimiento', value.tipo, movementTypes, (type) => edit('tipo', type))}
          {bind('Concepto', 'concepto', { required: true })}
          {bind('Importe', 'importe', { ...numeric, required: true })}
          {optionField('Medio de pago', value.medio, methods, (method) => edit('medio', method))}
          {bind('Observación', 'observacion')}
        </>}
        <button className="save-button">Aplicar cambios</button>
        <button type="button" className="backup-secondary-button" onClick={closeEditor}>Cancelar</button>
      </fieldset>
    </form>
  }

  const report = (share) => exportTripPdf(active, share).catch((error) => {
    if (error.name !== 'AbortError') setStatus(error.message)
  })

  return <main className="page trip-page">
    <header className="page-header">
      <button className="home-button" disabled={busy || Boolean(editor)} onClick={active ? () => setActiveId(null) : onGoHome}>{active ? '← Viajes' : '← Inicio'}</button>
      <h1>Planilla de viaje</h1>
    </header>
    <p role="status" className="local-status">{status}</p>
    {editor ? renderEditor() : !active ? <>
      <button className="add-button" disabled={!loaded} onClick={() => open('trip', blankTrip())}>Crear viaje</button>
      <TripImport clients={clientes} trips={trips} disabled={!loaded} onImported={(trip) => {
        setTrips((previous) => [...previous, trip])
        setActiveId(trip.id)
        setTab('filas')
        setStatus('Planilla importada en este dispositivo.')
      }} />
      <p><label><input type="checkbox" checked={archived} onChange={({ target }) => setArchived(target.checked)} /> Ver archivados</label></p>
      {trips.filter((trip) => trip.archivado === archived).sort((a, b) => b.fecha.localeCompare(a.fecha)).map((trip) =>
        <button key={trip.id} className="select-client-card" onClick={() => { setActiveId(trip.id); setTab('filas'); setStatus('') }}>
          <div><strong>{trip.destino}</strong><span>{trip.fecha} · {trip.filas.length} filas</span></div><span>›</span>
        </button>)}
    </> : <>
      <section className="selected-client-card"><div><h2>{active.destino}</h2><p>{active.fecha}{active.archivado ? ' · Archivado' : ''}</p>{active.detalleCarga && <p>{active.detalleCarga}</p>}</div></section>
      <div className="trip-actions">
        <button className="edit-button" disabled={busy} onClick={() => open('trip', active)}>Editar viaje</button>
        <button className="edit-button" disabled={busy} onClick={() => store({ ...active, archivado: !active.archivado })}>{active.archivado ? 'Reactivar' : 'Archivar'}</button>
        <button className="edit-button" onClick={() => report(false)}>Descargar PDF</button>
        {navigator.share && <button className="edit-button" onClick={() => report(true)}>Compartir PDF</button>}
      </div>
      <dl className="totals-grid">
        {tripTotalEntries(active).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <div className="trip-actions" aria-label="Secciones de planilla">
        <button className="edit-button" aria-pressed={tab === 'filas'} onClick={() => setTab('filas')}>Cobros y reparto</button>
        <button className="edit-button" aria-pressed={tab === 'movimientos'} onClick={() => setTab('movimientos')}>Gastos</button>
      </div>
      <button className="add-button" disabled={busy} onClick={() => open(tab, tab === 'filas' ? blankRow : blankMovement(active.fecha))}>
        {tab === 'filas' ? 'Agregar fila' : 'Agregar movimiento'}
      </button>
      {tab === 'filas' ? <TripRows rows={active.filas} busy={busy} onEdit={(item) => open(tab, item)} onRemove={(id) => remove(tab, id)} />
        : active.movimientos.map((item) => <article className="order-item" key={item.id}>
          <div className="order-item-information"><strong>{item.concepto} · {formatMoney(item.importe)}</strong>
            <span>{item.fecha} · {item.tipo} · {item.medio}</span>{item.observacion && <small>{item.observacion}</small>}</div>
          <button className="edit-button" disabled={busy} onClick={() => open(tab, item)}>Editar</button>
          <button className="delete-button" disabled={busy} aria-label={`Eliminar ${item.concepto}`} onClick={() => remove(tab, item.id)}>×</button>
        </article>)}
    </>}
  </main>
}

function TripRows({ rows, busy, onEdit, onRemove }) {
  if (!rows.length) return <p>Todavía no hay filas de reparto.</p>
  return <table className="trip-table">
    <thead><tr><th scope="col">Cliente</th><th scope="col">Bultos</th><th scope="col">Facturado</th><th scope="col">Saldo anterior</th><th scope="col">Cobrado</th><th scope="col">Pendiente</th><th scope="col">Acciones</th></tr></thead>
    <tbody>{rows.map((item) => {
      const { cobrado, pendiente } = rowTotals(item)
      return <tr key={item.id}>
        <td data-label="Cliente"><button className="row-link" disabled={busy} onClick={() => onEdit(item)}>{item.cliente}</button>{item.localidad && <small>{item.localidad}</small>}{item.clienteOriginal && item.clienteId == null && <small>Sin vincular</small>}{item.carga && <small>{item.carga}</small>}</td>
        <td data-label="Bultos">{item.bultos === '' || item.bultos == null ? '—' : item.bultos}</td>
        <td data-label="Facturado"><button className="row-link" disabled={busy} onClick={() => onEdit(item)}>{formatMoney(item.facturado)}</button></td>
        <td data-label="Saldo anterior">{formatPreviousBalance(item.saldoAnterior)}</td>
        <td data-label="Cobrado">{formatMoney(cobrado)}</td>
        <td data-label="Pendiente">{showPending(pendiente, item.saldoAnterior == null)}</td>
        <td data-label="Acciones"><button className="edit-button" disabled={busy} onClick={() => onEdit(item)}>Editar</button>{' '}
          <button className="delete-button" disabled={busy} aria-label={`Eliminar fila de ${item.cliente}`} onClick={() => onRemove(item.id)}>×</button></td>
      </tr>
    })}</tbody>
  </table>
}
