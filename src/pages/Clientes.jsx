import { useEffect, useState } from 'react'

const EMPTY_FORM = {
  nombre: '',
  localidad: '',
  direccion: '',
  zona: '',
  telefono: '',
  observaciones: '',
}

function Clientes({
  clientes,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onGoHome,
}) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingClientId, setEditingClientId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [notification, setNotification] = useState('')

  const clientesFiltrados = clientes.filter((cliente) => {
    const texto = [
      cliente.nombre,
      cliente.localidad,
      cliente.direccion,
      cliente.zona,
      cliente.telefono,
    ]
      .join(' ')
      .toLowerCase()

    return texto.includes(search.toLowerCase())
  })

  useEffect(() => {
    if (!notification) return undefined

    const timer = window.setTimeout(() => {
      setNotification('')
    }, 2500)

    return () => window.clearTimeout(timer)
  }, [notification])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function openNewClientForm() {
    setEditingClientId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEditClientForm(cliente) {
    setEditingClientId(cliente.id)

    setForm({
      nombre: cliente.nombre || '',
      localidad: cliente.localidad || '',
      direccion: cliente.direccion || '',
      zona: cliente.zona || '',
      telefono: cliente.telefono || '',
      observaciones: cliente.observaciones || '',
    })

    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setEditingClientId(null)
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.nombre.trim()) {
      alert('Ingresá el nombre del cliente.')
      return
    }

    const clientData = {
      id: editingClientId || crypto.randomUUID(),
      nombre: form.nombre.trim(),
      localidad: form.localidad.trim(),
      direccion: form.direccion.trim(),
      zona: form.zona.trim(),
      telefono: form.telefono.trim(),
      observaciones: form.observaciones.trim(),
    }

    if (editingClientId) {
      onUpdateClient(clientData)
      setNotification('Cliente actualizado correctamente')
    } else {
      onAddClient(clientData)
      setNotification('Cliente guardado correctamente')
    }

    closeForm()
  }

  return (
    <main className="page">
      {notification && (
        <div className="notification" role="status">
          ✓ {notification}
        </div>
      )}

      <header className="page-header">
        <button className="home-button" type="button" onClick={onGoHome}>
          ← Inicio
        </button>

        <h1>Clientes</h1>
      </header>

      <div className="page-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Buscar cliente, localidad o zona"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {!showForm && (
          <button
            className="add-button"
            type="button"
            onClick={openNewClientForm}
          >
            + Agregar cliente
          </button>
        )}
      </div>

      {showForm && (
        <form className="client-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <h2>
              {editingClientId ? 'Editar cliente' : 'Agregar cliente'}
            </h2>

            <button
              className="close-form-button"
              type="button"
              onClick={closeForm}
              aria-label="Cerrar formulario"
            >
              ×
            </button>
          </div>

          <label>
            Nombre del cliente *
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ejemplo: Veterinaria San Martín"
              autoFocus
            />
          </label>

          <label>
            Localidad
            <input
              name="localidad"
              value={form.localidad}
              onChange={handleChange}
              placeholder="Ejemplo: Vera"
            />
          </label>

          <label>
            Dirección
            <input
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              placeholder="Ejemplo: San Martín 123"
            />
          </label>

          <label>
            Zona
            <input
              name="zona"
              value={form.zona}
              onChange={handleChange}
              placeholder="Ejemplo: Zona Norte"
            />
          </label>

          <label>
            Teléfono
            <input
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              placeholder="Ejemplo: 3492 123456"
            />
          </label>

          <label>
            Observaciones
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              placeholder="Información opcional"
              rows="3"
            />
          </label>

          <button className="save-button" type="submit">
            {editingClientId ? 'Guardar cambios' : 'Guardar cliente'}
          </button>
        </form>
      )}

      <section className="client-list">
        {clientesFiltrados.length === 0 ? (
          <div className="empty-state">
            <span>👥</span>

            <h2>
              {clientes.length === 0
                ? 'No hay clientes'
                : 'No encontramos resultados'}
            </h2>

            <p>
              {clientes.length === 0
                ? 'Agregá el primer cliente para comenzar.'
                : 'Probá con otro nombre, localidad o zona.'}
            </p>
          </div>
        ) : (
          clientesFiltrados.map((cliente) => (
            <article className="client-card" key={cliente.id}>
              <div className="client-information">
                <strong>{cliente.nombre}</strong>

                <span>
                  {cliente.localidad || 'Localidad sin especificar'}
                </span>

                {cliente.direccion && (
                  <small>Dirección: {cliente.direccion}</small>
                )}

                {cliente.zona && <small>Zona: {cliente.zona}</small>}

                {cliente.telefono && (
                  <small>Teléfono: {cliente.telefono}</small>
                )}

                {cliente.observaciones && (
                  <small>Observaciones: {cliente.observaciones}</small>
                )}
              </div>

              <div className="client-actions">
                <button
                  className="edit-button"
                  type="button"
                  onClick={() => openEditClientForm(cliente)}
                >
                  Editar
                </button>

                <button
                  className="delete-button"
                  type="button"
                  onClick={() => onDeleteClient(cliente.id)}
                  aria-label={`Eliminar ${cliente.nombre}`}
                >
                  ×
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  )
}

export default Clientes