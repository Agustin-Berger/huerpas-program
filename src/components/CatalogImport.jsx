import { useState } from 'react'
import { applyCatalog, inspectCatalog } from '../database/catalog'

export default function CatalogImport({ onImported }) {
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  async function browse({ target }) {
    const file = target.files?.[0]
    target.value = ''
    if (!file) return
    setPreview(null)
    setStatus('')
    setBusy(true)
    try {
      setPreview(await inspectCatalog(file))
    } catch (error) {
      setStatus(error instanceof SyntaxError ? 'El archivo no es un JSON válido.' : error.message)
    } finally {
      setBusy(false)
    }
  }

  async function apply() {
    setBusy(true)
    try {
      onImported(await applyCatalog(preview.incoming, preview.baseline))
      setStatus('Catálogo actualizado.')
      setPreview(null)
    } catch (error) {
      setStatus(error.message)
      setPreview(null)
    } finally {
      setBusy(false)
    }
  }

  return <section className="backup-section">
    <h2>Importar catálogo</h2>
    <label>Elegir un catálogo o respaldo JSON <input type="file" accept=".json,application/json" onChange={browse} disabled={busy} /></label>
    <p>Se incorporan únicamente los productos del archivo.</p>
    {preview && <>
      <dl className="totals-grid">
        {Object.entries({ ...preview.counts, conflictos: preview.conflicts.length }).map(([label, count]) =>
          <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}
      </dl>
      {preview.reassignedIds.length > 0 && <p>Estos códigos nuevos recibirán IDs nuevos porque los del archivo ya están en uso: {preview.reassignedIds.join(', ')}.</p>}
      {preview.conflicts.length > 0 && <ul>{preview.conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}</ul>}
      <button className="backup-primary-button" onClick={apply} disabled={busy || preview.conflicts.length > 0}>Aplicar catálogo</button>
      <button className="backup-secondary-button" onClick={() => setPreview(null)} disabled={busy}>Cancelar</button>
    </>}
    {status && <p role="status">{status}</p>}
  </section>
}
