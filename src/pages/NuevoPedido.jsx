import { useRef, useState } from 'react'

function NuevoPedido({
  clientes,
  productos,
  pedidoEditando,
  onSaveOrder,
  onGoHome,
  onFinish,
}) {
  const clienteInicial = pedidoEditando
    ? clientes.find(
        (cliente) => cliente.id === pedidoEditando.clienteId,
      ) || {
        id: pedidoEditando.clienteId,
        nombre: pedidoEditando.clienteNombre,
        localidad: pedidoEditando.clienteLocalidad || '',
        zona: '',
      }
    : null

  const [searchClient, setSearchClient] = useState('')
  const [selectedClient, setSelectedClient] = useState(clienteInicial)

  const [searchProduct, setSearchProduct] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [clarification, setClarification] = useState('')

  const [orderItems, setOrderItems] = useState(
    pedidoEditando?.productos || [],
  )

  const [generalObservation, setGeneralObservation] = useState(
    pedidoEditando?.observacionGeneral || '',
  )

  const [editingItemId, setEditingItemId] = useState(null)
  const [notification, setNotification] = useState('')

  const productSearchRef = useRef(null)

  const clientesFiltrados = clientes.filter((cliente) => {
    const texto = [
      cliente.nombre,
      cliente.localidad,
      cliente.direccion,
      cliente.zona,
    ]
      .join(' ')
      .toLowerCase()

    return texto.includes(searchClient.toLowerCase())
  })

  const productosFiltrados =
    searchProduct.trim().length === 0
      ? []
      : productos.filter((producto) => {
          const texto =
            `${producto.codigo} ${producto.descripcion}`.toLowerCase()

          return texto.includes(searchProduct.toLowerCase())
        })

  function showNotification(message) {
    setNotification(message)

    window.setTimeout(() => {
      setNotification('')
    }, 2500)
  }

  function selectClient(cliente) {
    setSelectedClient(cliente)
    setSearchClient('')
  }

  function changeClient() {
    if (orderItems.length > 0) {
      const confirmed = window.confirm(
        'Si cambiás el cliente, se eliminarán los productos cargados. ¿Continuar?',
      )

      if (!confirmed) return
    }

    setSelectedClient(null)
    setOrderItems([])
    setGeneralObservation('')
    resetProductForm()
  }

  function selectProduct(producto) {
    setSelectedProduct(producto)
    setSearchProduct(`${producto.codigo} - ${producto.descripcion}`)
    setQuantity(1)
    setClarification('')
  }

  function decreaseQuantity() {
    setQuantity((currentQuantity) =>
      Math.max(1, currentQuantity - 1),
    )
  }

  function increaseQuantity() {
    setQuantity((currentQuantity) => currentQuantity + 1)
  }

  function handleQuantityChange(event) {
    const value = Number(event.target.value)

    if (!Number.isFinite(value)) return

    setQuantity(Math.max(1, Math.floor(value)))
  }

  function addProductToOrder() {
    if (!selectedProduct) {
      alert('Seleccioná un producto.')
      return
    }

    if (quantity < 1) {
      alert('La cantidad debe ser mayor a cero.')
      return
    }

    const productAlreadyExists = orderItems.some(
      (item) =>
        item.productId === selectedProduct.id &&
        item.id !== editingItemId,
    )

    if (productAlreadyExists && !editingItemId) {
      const repeatProduct = window.confirm(
        'Este producto ya existe en el pedido. ¿Deseás repetirlo?',
      )

      if (!repeatProduct) return
    }

    const itemData = {
      id: editingItemId || crypto.randomUUID(),
      productId: selectedProduct.id,
      codigo: selectedProduct.codigo,
      descripcion: selectedProduct.descripcion,
      cantidad: quantity,
      aclaracion: clarification.trim(),
    }

    if (editingItemId) {
      setOrderItems((currentItems) =>
        currentItems.map((item) =>
          item.id === editingItemId ? itemData : item,
        ),
      )

      showNotification('Producto actualizado')
    } else {
      setOrderItems((currentItems) => [...currentItems, itemData])
      showNotification('Producto agregado al pedido')
    }

    resetProductForm()
  }

  function editOrderItem(item) {
    const producto = productos.find(
      (currentProduct) => currentProduct.id === item.productId,
    )

    if (!producto) {
      alert('El producto ya no existe en la base de productos.')
      return
    }

    setEditingItemId(item.id)
    setSelectedProduct(producto)
    setSearchProduct(`${producto.codigo} - ${producto.descripcion}`)
    setQuantity(item.cantidad)
    setClarification(item.aclaracion || '')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function deleteOrderItem(itemId) {
    const confirmed = window.confirm(
      '¿Querés eliminar este producto del pedido?',
    )

    if (!confirmed) return

    setOrderItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId),
    )

    if (editingItemId === itemId) {
      resetProductForm()
    }
  }

  function resetProductForm() {
    setEditingItemId(null)
    setSelectedProduct(null)
    setSearchProduct('')
    setQuantity(1)
    setClarification('')

    window.setTimeout(() => {
      productSearchRef.current?.focus()
    }, 0)
  }

  function saveOrder() {
    if (!selectedClient) {
      alert('Seleccioná un cliente.')
      return
    }

    if (orderItems.length === 0) {
      alert('Agregá al menos un producto.')
      return
    }

    const currentDate = new Date().toISOString()

    const order = {
      id: pedidoEditando?.id || crypto.randomUUID(),
      clienteId: selectedClient.id,
      clienteNombre: selectedClient.nombre,
      clienteLocalidad: selectedClient.localidad || '',
      fecha: pedidoEditando?.fecha || currentDate,
      fechaEdicion: pedidoEditando ? currentDate : null,
      productos: orderItems,
      observacionGeneral: generalObservation.trim(),
      estado: pedidoEditando ? 'editado' : 'no-leido',
      editado: Boolean(pedidoEditando),
    }

    onSaveOrder(order)

    showNotification(
      pedidoEditando
        ? 'Pedido actualizado correctamente'
        : 'Pedido guardado correctamente',
    )

    window.setTimeout(() => {
      onFinish()
    }, 700)
  }

  if (!selectedClient) {
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

          <h1>
            {pedidoEditando ? 'Editar pedido' : 'Nuevo pedido'}
          </h1>
        </header>

        <section className="select-client-heading">
          <p>Paso 1</p>
          <h2>Seleccioná un cliente</h2>
        </section>

        <input
          className="search-input"
          type="search"
          placeholder="Buscar por nombre, localidad o zona"
          value={searchClient}
          onChange={(event) => setSearchClient(event.target.value)}
          autoFocus
        />

        <section className="order-client-list">
          {clientes.length === 0 ? (
            <div className="empty-state">
              <span>👥</span>
              <h2>No hay clientes cargados</h2>
              <p>Primero agregá clientes desde la pantalla Clientes.</p>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="empty-state">
              <span>🔍</span>
              <h2>No encontramos clientes</h2>
              <p>Probá buscando por otro nombre, localidad o zona.</p>
            </div>
          ) : (
            clientesFiltrados.map((cliente) => (
              <button
                className="select-client-card"
                type="button"
                key={cliente.id}
                onClick={() => selectClient(cliente)}
              >
                <div>
                  <strong>{cliente.nombre}</strong>

                  <span>
                    {cliente.localidad ||
                      'Localidad sin especificar'}
                  </span>

                  {cliente.zona && (
                    <small>Zona: {cliente.zona}</small>
                  )}
                </div>

                <span className="select-client-arrow">›</span>
              </button>
            ))
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      {notification && (
        <div className="notification" role="status">
          ✓ {notification}
        </div>
      )}

      <header className="page-header">
        <button
          className="home-button"
          type="button"
          onClick={onGoHome}
        >
          ← Inicio
        </button>

        <h1>{pedidoEditando ? 'Editar pedido' : 'Nuevo pedido'}</h1>
      </header>

      <section className="selected-client-card">
        <div>
          <span className="selected-client-label">CLIENTE</span>
          <h2>{selectedClient.nombre}</h2>

          {selectedClient.localidad && (
            <p>{selectedClient.localidad}</p>
          )}

          {selectedClient.zona && (
            <small>Zona: {selectedClient.zona}</small>
          )}
        </div>

        <button
          className="change-client-button"
          type="button"
          onClick={changeClient}
        >
          Cambiar
        </button>
      </section>

      <section className="product-entry">
        <h2>
          {editingItemId ? 'Editar producto' : 'Agregar producto'}
        </h2>

        <div className="product-search-wrapper">
          <input
            ref={productSearchRef}
            className="search-input"
            type="search"
            placeholder="Buscar por código o descripción"
            value={searchProduct}
            onChange={(event) => {
              setSearchProduct(event.target.value)
              setSelectedProduct(null)
            }}
            autoComplete="off"
          />

          {productosFiltrados.length > 0 && !selectedProduct && (
            <div className="product-results">
              {productosFiltrados.slice(0, 8).map((producto) => (
                <button
                  type="button"
                  key={producto.id}
                  onClick={() => selectProduct(producto)}
                >
                  {producto.codigo} - {producto.descripcion}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedProduct && (
          <div className="selected-product">
            <strong>
              {selectedProduct.codigo} - {selectedProduct.descripcion}
            </strong>
          </div>
        )}

        <div className="quantity-section">
          <label>Cantidad</label>

          <div className="quantity-control">
            <button type="button" onClick={decreaseQuantity}>
              −
            </button>

            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={quantity}
              onChange={handleQuantityChange}
            />

            <button type="button" onClick={increaseQuantity}>
              +
            </button>
          </div>
        </div>

        <label className="clarification-field">
          Aclaración
          <textarea
            value={clarification}
            onChange={(event) =>
              setClarification(event.target.value)
            }
            placeholder="Ejemplo: verde, caja, 500 cc..."
            rows="2"
          />
        </label>

        <div className="product-form-actions">
          {editingItemId && (
            <button
              className="cancel-edit-button"
              type="button"
              onClick={resetProductForm}
            >
              Cancelar
            </button>
          )}

          <button
            className="add-product-button"
            type="button"
            onClick={addProductToOrder}
          >
            {editingItemId
              ? 'Guardar cambios'
              : 'Agregar al pedido'}
          </button>
        </div>
      </section>

      <section className="order-summary">
        <div className="order-summary-heading">
          <h2>Productos del pedido</h2>
          <span>{orderItems.length}</span>
        </div>

        {orderItems.length === 0 ? (
          <div className="compact-empty-state">
            Todavía no agregaste productos.
          </div>
        ) : (
          orderItems.map((item) => (
            <article className="order-item" key={item.id}>
              <div className="order-item-information">
                <strong>
                  {item.codigo} - {item.descripcion}
                </strong>

                <span>Cantidad: {item.cantidad}</span>

                {item.aclaracion && (
                  <small>Aclaración: {item.aclaracion}</small>
                )}
              </div>

              <div className="order-item-actions">
                <button
                  type="button"
                  onClick={() => editOrderItem(item)}
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => deleteOrderItem(item.id)}
                >
                  ×
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <label className="general-observation">
        Observación general del pedido
        <textarea
          value={generalObservation}
          onChange={(event) =>
            setGeneralObservation(event.target.value)
          }
          placeholder="Información general opcional"
          rows="3"
        />
      </label>

      <button
        className="save-order-button"
        type="button"
        onClick={saveOrder}
      >
        {pedidoEditando
          ? 'Guardar cambios del pedido'
          : 'Guardar pedido'}
      </button>
    </main>
  )
}

export default NuevoPedido