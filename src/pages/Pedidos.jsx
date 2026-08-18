import { useState } from 'react'
import { generateOrdersPdf } from '../utils/generateOrdersPdf'

function Pedidos({
  pedidos,
  onEditOrder,
  onDeleteOrder,
  onReadOrder,
  onGoHome,
}) {
  const [search, setSearch] = useState('')
  const [openedOrderId, setOpenedOrderId] = useState(null)

  const pedidosOrdenados = [...pedidos].sort(
    (a, b) => new Date(b.fecha) - new Date(a.fecha),
  )

  const pedidosFiltrados = pedidosOrdenados.filter((pedido) => {
    const productos = pedido.productos
      .map((producto) => `${producto.codigo} ${producto.descripcion}`)
      .join(' ')

    const texto = [
      pedido.clienteNombre,
      pedido.clienteLocalidad,
      productos,
    ]
      .join(' ')
      .toLowerCase()

    return texto.includes(search.toLowerCase())
  })

function toggleOrder(pedido) {
  const isOpening = openedOrderId !== pedido.id

  setOpenedOrderId(isOpening ? pedido.id : null)

  if (isOpening && pedido.estado !== 'leido') {
    onReadOrder(pedido.id)
  }
}
  return (
    <main className="page">
      <header className="page-header">
        <button className="home-button" type="button" onClick={onGoHome}>
          ← Inicio
        </button>

        <h1>Pedidos</h1>
      </header>

      <div className="page-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Buscar por cliente o producto"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
  className="download-orders-button"
  type="button"
  onClick={() => generateOrdersPdf(pedidosFiltrados)}
  disabled={pedidosFiltrados.length === 0}
>
  Descargar pedidos en PDF
</button>
      </div>

      <section className="orders-list">
        {pedidos.length === 0 ? (
          <div className="empty-state">
            <span>📝</span>
            <h2>No hay pedidos guardados</h2>
            <p>Los pedidos que realices aparecerán en esta pantalla.</p>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="empty-state">
            <span>🔍</span>
            <h2>No encontramos pedidos</h2>
            <p>Probá buscando por otro cliente o producto.</p>
          </div>
        ) : (
          pedidosFiltrados.map((pedido) => {
            const isOpen = openedOrderId === pedido.id

            return (
              <article className="saved-order-card" key={pedido.id}>
                <button
                  className="saved-order-header"
                  type="button"
                  onClick={() => toggleOrder(pedido)}
                >
                  <div>
                    <strong>{pedido.clienteNombre}</strong>

                    <span>
                      {formatDate(pedido.fecha)}
                      {pedido.clienteLocalidad
                        ? ` · ${pedido.clienteLocalidad}`
                        : ''}
                    </span>

                    <small>
                      {pedido.productos.length}{' '}
                      {pedido.productos.length === 1
                        ? 'producto'
                        : 'productos'}
                    </small>
                  </div>

                  <div className="saved-order-status">
                    <span
  className={`order-status ${
    pedido.estado === 'editado'
      ? 'edited'
      : pedido.estado === 'leido'
        ? 'read'
        : 'unread'
  }`}
>
  {pedido.estado === 'editado'
    ? 'EDITADO'
    : pedido.estado === 'leido'
      ? 'LEÍDO'
      : 'NO LEÍDO'}
</span>

                    <span className="order-expand-arrow">
                      {isOpen ? '⌃' : '⌄'}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="saved-order-detail">
                    <div className="saved-order-products">
                      {pedido.productos.map((producto) => (
                        <div
                          className="saved-order-product"
                          key={producto.id}
                        >
                          <strong>
                            {producto.codigo} - {producto.descripcion}
                          </strong>

                          <span>Cantidad: {producto.cantidad}</span>

                          {producto.aclaracion && (
                            <small>
                              Aclaración: {producto.aclaracion}
                            </small>
                          )}
                        </div>
                      ))}
                    </div>

                    {pedido.observacionGeneral && (
                      <div className="saved-order-observation">
                        <strong>Observación general</strong>
                        <p>{pedido.observacionGeneral}</p>
                      </div>
                    )}

                    {pedido.fechaEdicion && (
                      <p className="edited-date">
                        Última edición: {formatDate(pedido.fechaEdicion)}
                      </p>
                    )}

                    <div className="saved-order-actions">
                      <button
                        className="edit-order-button"
                        type="button"
                        onClick={() => onEditOrder(pedido)}
                      >
                        Editar pedido
                      </button>

                      <button
                        className="delete-order-button"
                        type="button"
                        onClick={() => onDeleteOrder(pedido.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )
          })
        )}
      </section>
    </main>
  )
}

function formatDate(date) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date))
}

export default Pedidos