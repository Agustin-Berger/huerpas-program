import { useRef, useState } from 'react'

import {
  exportBackup,
  importBackup,
} from '../database/backup'

function Mas({
  onGoHome,
  onBackupImported,
}) {
  const fileInputRef = useRef(null)

  const [message, setMessage] =
    useState('')

  async function handleExport() {
    try {
      await exportBackup()

      setMessage(
        'Respaldo descargado correctamente.',
      )
    } catch (error) {
      console.error(error)

      setMessage(
        'No se pudo generar el respaldo.',
      )
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0]

    if (!file) return

    const confirmed = window.confirm(
      'Los datos del archivo se agregarán o actualizarán en esta instalación. ¿Continuar?',
    )

    if (!confirmed) {
      event.target.value = ''
      return
    }

    try {
      const importedData =
        await importBackup(file)

      onBackupImported(importedData)

      setMessage(
        'Datos importados correctamente.',
      )
    } catch (error) {
      console.error(error)

      window.alert(error.message)
    } finally {
      event.target.value = ''
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <button
          className="home-button"
          type="button"
          onClick={onGoHome}
        >
          ← Inicio
        </button>

        <h1>Más</h1>
      </header>

      <section className="backup-section">
        <h2>Datos y respaldo</h2>

        <p>
          Guardá una copia de clientes,
          productos y pedidos para poder
          restaurarlos en otro dispositivo.
        </p>

        <button
          className="backup-primary-button"
          type="button"
          onClick={handleExport}
        >
          Descargar copia de seguridad
        </button>

        <button
          className="backup-secondary-button"
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
        >
          Importar copia de seguridad
        </button>

        <input
          ref={fileInputRef}
          className="backup-file-input"
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
        />

        {message && (
          <p className="backup-message">
            ✓ {message}
          </p>
        )}
      </section>
    </main>
  )
}

export default Mas