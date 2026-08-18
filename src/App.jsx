import { useEffect, useState } from 'react'
import Home from './pages/Home'
import Clientes from './pages/Clientes'
import Productos from './pages/Productos'
import NuevoPedido from './pages/NuevoPedido'
import Pedidos from './pages/Pedidos'
import './App.css'

const CLIENTES_STORAGE_KEY = 'huerpas-clientes'
const PRODUCTOS_STORAGE_KEY = 'huerpas-productos'
const PEDIDOS_STORAGE_KEY = 'huerpas-pedidos'

function App() {
  const [currentPage, setCurrentPage] = useState('inicio')
  const [pedidoEditando, setPedidoEditando] = useState(null)

  const [clientes, setClientes] = useState(() =>
    getStoredData(CLIENTES_STORAGE_KEY),
  )

  const [productos, setProductos] = useState(() =>
    getStoredData(PRODUCTOS_STORAGE_KEY),
  )

  const [pedidos, setPedidos] = useState(() =>
    getStoredData(PEDIDOS_STORAGE_KEY),
  )

  useEffect(() => {
    saveStoredData(CLIENTES_STORAGE_KEY, clientes)
  }, [clientes])

  useEffect(() => {
    saveStoredData(PRODUCTOS_STORAGE_KEY, productos)
  }, [productos])

  useEffect(() => {
    saveStoredData(PEDIDOS_STORAGE_KEY, pedidos)
  }, [pedidos])
  function readOrder(orderId) {
  setPedidos((currentOrders) =>
    currentOrders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            estado: 'leido',
            editado: false,
          }
        : order,
    ),
  )
}

  function navigate(page) {
    if (page === 'nuevo-pedido') {
      setPedidoEditando(null)
    }

    setCurrentPage(page)
  }

  function addClient(newClient) {
    setClientes((currentClients) => [...currentClients, newClient])
  }

  function updateClient(updatedClient) {
    setClientes((currentClients) =>
      currentClients.map((cliente) =>
        cliente.id === updatedClient.id ? updatedClient : cliente,
      ),
    )
  }

  function deleteClient(clientId) {
    const confirmed = window.confirm('¿Querés eliminar este cliente?')

    if (!confirmed) return

    setClientes((currentClients) =>
      currentClients.filter((cliente) => cliente.id !== clientId),
    )
  }

  function addProduct(newProduct) {
    setProductos((currentProducts) => [...currentProducts, newProduct])
  }

  function updateProduct(updatedProduct) {
    setProductos((currentProducts) =>
      currentProducts.map((producto) =>
        producto.id === updatedProduct.id ? updatedProduct : producto,
      ),
    )
  }

  function deleteProduct(productId) {
    const confirmed = window.confirm('¿Querés eliminar este producto?')

    if (!confirmed) return

    setProductos((currentProducts) =>
      currentProducts.filter((producto) => producto.id !== productId),
    )
  }

  function saveOrder(order) {
    const orderAlreadyExists = pedidos.some(
      (currentOrder) => currentOrder.id === order.id,
    )

    if (orderAlreadyExists) {
      setPedidos((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id ? order : currentOrder,
        ),
      )
    } else {
      setPedidos((currentOrders) => [...currentOrders, order])
    }
  }

  function editOrder(order) {
    setPedidoEditando(order)
    setCurrentPage('nuevo-pedido')
  }

  function deleteOrder(orderId) {
    const confirmed = window.confirm(
      '¿Querés eliminar este pedido definitivamente?',
    )

    if (!confirmed) return

    setPedidos((currentOrders) =>
      currentOrders.filter((order) => order.id !== orderId),
    )
  }

  function finishOrder() {
    setPedidoEditando(null)
    setCurrentPage('pedidos')
  }

  function renderPage() {
    if (currentPage === 'inicio') {
      return <Home onNavigate={navigate} />
    }
    if (currentPage === 'pedidos') {
  return (
    <Pedidos
      pedidos={pedidos}
      onEditOrder={editOrder}
      onDeleteOrder={deleteOrder}
      onReadOrder={readOrder}
      onGoHome={() => setCurrentPage('inicio')}
    />
  )
}

    if (currentPage === 'clientes') {
      return (
        <Clientes
          clientes={clientes}
          onAddClient={addClient}
          onUpdateClient={updateClient}
          onDeleteClient={deleteClient}
          onGoHome={() => setCurrentPage('inicio')}
        />
      )
    }

    if (currentPage === 'productos') {
      return (
        <Productos
          productos={productos}
          onAddProduct={addProduct}
          onUpdateProduct={updateProduct}
          onDeleteProduct={deleteProduct}
          onGoHome={() => setCurrentPage('inicio')}
        />
      )
    }

    if (currentPage === 'nuevo-pedido') {
      return (
        <NuevoPedido
          clientes={clientes}
          productos={productos}
          pedidoEditando={pedidoEditando}
          onSaveOrder={saveOrder}
          onGoHome={() => {
            setPedidoEditando(null)
            setCurrentPage('inicio')
          }}
          onFinish={finishOrder}
        />
      )
    }

    if (currentPage === 'pedidos') {
      return (
        <Pedidos
          pedidos={pedidos}
          onEditOrder={editOrder}
          onDeleteOrder={deleteOrder}
          onGoHome={() => setCurrentPage('inicio')}
        />
      )
    }

    return (
      <main className="temporary-page">
        <button
          className="back-button"
          type="button"
          onClick={() => setCurrentPage('inicio')}
        >
          ← Inicio
        </button>

        <h1>{getPageTitle(currentPage)}</h1>
        <p>Esta pantalla todavía está en construcción.</p>
      </main>
    )
  }

  return <div className="app-shell">{renderPage()}</div>
}

function getStoredData(key) {
  try {
    const storedData = localStorage.getItem(key)
    return storedData ? JSON.parse(storedData) : []
  } catch (error) {
    console.error(`No se pudieron recuperar los datos de ${key}:`, error)
    return []
  }
}

function saveStoredData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error(`No se pudieron guardar los datos de ${key}:`, error)
  }
}

function getPageTitle(page) {
  const titles = {
    mas: 'Más',
  }

  return titles[page] || 'Huerpas Program'
}

export default App