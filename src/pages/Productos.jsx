import { useEffect, useState } from 'react'

const EMPTY_FORM = {
  codigo: '',
  descripcion: '',
}

function Productos({
  productos,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onGoHome,
}) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [notification, setNotification] = useState('')

  const productosFiltrados = productos.filter((producto) => {
    const texto = `${producto.codigo} ${producto.descripcion}`.toLowerCase()

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

  function openNewProductForm() {
    setEditingProductId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEditProductForm(producto) {
    setEditingProductId(producto.id)

    setForm({
      codigo: producto.codigo || '',
      descripcion: producto.descripcion || '',
    })

    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setEditingProductId(null)
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  function handleSubmit(event) {
    event.preventDefault()

    const codigo = form.codigo.trim()
    const descripcion = form.descripcion.trim()

    if (!codigo) {
      alert('Ingresá el código del producto.')
      return
    }

    if (!descripcion) {
      alert('Ingresá la descripción del producto.')
      return
    }

    const codigoDuplicado = productos.some(
      (producto) =>
        producto.codigo.toLowerCase() === codigo.toLowerCase() &&
        producto.id !== editingProductId,
    )

    if (codigoDuplicado) {
      alert('Ya existe un producto con ese código.')
      return
    }

    const productData = {
      id: editingProductId || crypto.randomUUID(),
      codigo,
      descripcion,
    }

    if (editingProductId) {
      onUpdateProduct(productData)
      setNotification('Producto actualizado correctamente')
    } else {
      onAddProduct(productData)
      setNotification('Producto guardado correctamente')
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

        <h1>Productos</h1>
      </header>

      <div className="page-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Buscar por código o descripción"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {!showForm && (
          <button
            className="add-button"
            type="button"
            onClick={openNewProductForm}
          >
            + Agregar producto
          </button>
        )}
      </div>

      {showForm && (
        <form className="client-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <h2>
              {editingProductId ? 'Editar producto' : 'Agregar producto'}
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
            Código *
            <input
              name="codigo"
              value={form.codigo}
              onChange={handleChange}
              placeholder="Ejemplo: 430"
              autoFocus
            />
          </label>

          <label>
            Descripción *
            <input
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Ejemplo: Ultra Pum"
            />
          </label>

          <button className="save-button" type="submit">
            {editingProductId ? 'Guardar cambios' : 'Guardar producto'}
          </button>
        </form>
      )}

      <section className="product-list">
        {productosFiltrados.length === 0 ? (
          <div className="empty-state">
            <span>📦</span>

            <h2>
              {productos.length === 0
                ? 'No hay productos'
                : 'No encontramos resultados'}
            </h2>

            <p>
              {productos.length === 0
                ? 'Agregá el primer producto para comenzar.'
                : 'Probá con otro código o descripción.'}
            </p>
          </div>
        ) : (
          productosFiltrados.map((producto) => (
            <article className="product-card" key={producto.id}>
              <div className="product-information">
                <strong>
                  {producto.codigo} - {producto.descripcion}
                </strong>
              </div>

              <div className="client-actions">
                <button
                  className="edit-button"
                  type="button"
                  onClick={() => openEditProductForm(producto)}
                >
                  Editar
                </button>

                <button
                  className="delete-button"
                  type="button"
                  onClick={() => onDeleteProduct(producto.id)}
                  aria-label={`Eliminar ${producto.descripcion}`}
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

export default Productos