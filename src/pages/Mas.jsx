import { useState } from 'react'
import { exportBackup, readBackup, restoreBackup } from '../database/backup'
import SeedSettings from '../components/SeedSettings'

export default function Mas({ onGoHome, onBackupImported, productos, semillas, onSeedsChanged }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(operation) {
    setBusy(true)
    try {
      await operation()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  return <main className="page">
    <header className="page-header"><button className="home-button" disabled={busy} onClick={onGoHome}>← Inicio</button><h1>Más</h1></header>
    <section className="backup-section">
      <h2>Datos y respaldo</h2>
      <p>Incluye clientes, productos, pedidos, borradores, semillas y viajes.</p>
      <button className="backup-primary-button" disabled={busy} onClick={() => run(async () => {
        await exportBackup()
        setMessage('Respaldo generado.')
      })}>Descargar copia de seguridad</button>
      <p><label>Importar copia de seguridad <input type="file" accept=".json,application/json" disabled={busy}
        onChange={({ target }) => {
          const file = target.files?.[0]
          target.value = ''
          if (!file) return
          void run(async () => {
            const data = await readBackup(file)
            if (!window.confirm('Los registros con el mismo ID se actualizarán. Se descargará un respaldo de los datos actuales antes de importar. ¿Continuar?')) return
            await exportBackup()
            onBackupImported(await restoreBackup(data))
            setMessage('Respaldo incorporado correctamente.')
          })
        }} /></label></p>
      {message && <p role="status">{message}</p>}
    </section>
    <fieldset className="plain-fields" disabled={busy}>
      <SeedSettings productos={productos} records={semillas} onChange={onSeedsChanged} />
    </fieldset>
  </main>
}
