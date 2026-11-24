import { useRef, useState } from 'react'
import { insertImportedTrip } from '../database/tripImport'
import { downloadJson } from '../utils/downloadJson'
import { inspectTripImport, matchingTrip, tripImportExample } from '../utils/tripImport'
import { formatMoney } from '../utils/trips'

export default function TripImport({ clients, trips, disabled, onImported }) {
  const input = useRef(null)
  const saving = useRef(false)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const duplicate = preview?.duplicate ?? (preview?.trip && matchingTrip(trips, preview.trip.origenPlanilla))

  async function choose({ target }) {
    const file = target.files?.[0]
    target.value = ''
    if (!file) return
    setPreview(null)
    setBusy(true)
    try {
      setPreview({ filename: file.name, ...inspectTripImport(JSON.parse(await file.text()), clients) })
    } catch (error) {
      setPreview({ filename: file.name, errors: [error instanceof SyntaxError ? 'El archivo no es un JSON válido.' : error.message] })
    } finally {
      setBusy(false)
    }
  }

  async function apply() {
    if (saving.current || !preview?.trip || preview.errors.length) return
    saving.current = true
    setBusy(true)
    try {
      const result = await insertImportedTrip(preview.trip, Boolean(duplicate))
      if (result.duplicate) {
        setPreview({ ...preview, duplicate: result.duplicate })
        return
      }
      setPreview(null)
      onImported(result.saved)
    } catch (error) {
      setPreview({ ...preview, saveError: `No se importó la planilla. ${error.message}` })
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return <section className="backup-section" aria-label="Importar planilla">
    <button className="backup-primary-button" type="button" onClick={() => input.current?.click()} disabled={busy || disabled}>Importar planilla JSON</button>
    <button className="backup-secondary-button" type="button"
      onClick={() => downloadJson(tripImportExample, 'Huerpas_Viaje_Ejemplo.json')}>Descargar JSON de ejemplo</button>
    <input ref={input} className="backup-file-input" type="file" accept=".json,application/json" aria-label="Archivo de planilla JSON" onChange={choose} />
    {preview && <section className="trip-import-preview" aria-label="Vista previa de importación">
      <h2>Vista previa</h2>
      <p>{preview.filename}</p>
      {preview.trip && <>
        <p><strong>{preview.trip.destino}</strong> · {preview.trip.fecha}</p>
        <dl className="totals-grid">
          <div><dt>Clientes</dt><dd>{preview.clientes}</dd></div>
          <div><dt>Filas de reparto</dt><dd>{preview.trip.filas.length}</dd></div>
          <div><dt>Total de importes</dt><dd>{formatMoney(preview.total)}</dd></div>
          <div><dt>Filas vinculadas a clientes</dt><dd>{preview.vinculados}</dd></div>
          <div><dt>Gastos e ingresos</dt><dd>{preview.trip.movimientos.length}</dd></div>
        </dl>
      </>}
      {preview.errors.length > 0 && <div role="alert"><p>Corregí el archivo antes de importar.</p>
        <ul>{preview.errors.map((error) => <li key={error}>{error}</li>)}</ul>
      </div>}
      {duplicate && !preview.errors.length && <p role="status">
        Ya existe un viaje con ese nombre y fecha. Crear una copia conserva el viaje existente y sus cobranzas.
      </p>}
      {preview.saveError && <p role="alert">{preview.saveError}</p>}
      <button className="backup-primary-button" type="button" disabled={busy || preview.errors.length > 0} onClick={apply}>
        {duplicate ? 'Crear copia del viaje' : 'Confirmar importación'}
      </button>
      <button className="backup-secondary-button" type="button" onClick={() => setPreview(null)} disabled={busy}>Cancelar importación</button>
    </section>}
  </section>
}
