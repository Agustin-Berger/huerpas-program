import { useEffect, useState } from 'react'

import Home from './pages/Home'
import Clientes from './pages/Clientes'
import Productos from './pages/Productos'
import NuevoPedido from './pages/NuevoPedido'
import Pedidos from './pages/Pedidos'
import Mas from './pages/Mas'
import {
  STORES,
  deleteItem,
  getAllItems,
 
  saveItem,
} from './database/db'

import './App.css'

function App() {
  const [currentPage, setCurrentPage] =
    useState('inicio')

  const [pedidoEditando, setPedidoEditando] =
    useState(null)

  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [pedidos, setPedidos] = useState([])

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDatabase() {
      try {
        
        const [
          clientesGuardados,
          productosGuardados,
          pedidosGuardados,
        ] = await Promise.all([
          getAllItems(STORES.CLIENTES),
          getAllItems(STORES.PRODUCTOS),
          getAllItems(STORES.PEDIDOS),
        ])

        setClientes(clientesGuardados)
        setProductos(productosGuardados)
        setPedidos(pedidosGuardados)
      } catch (error) {
        console.error(
          'Error cargando la base de datos:',
          error,
        )
      } finally {
        setLoading(false)
      }
    }

    loadDatabase()
  }, [])

  function navigate(page) {
    if (page === 'nuevo-pedido') {
      setPedidoEditando(null)
    }

    setCurrentPage(page)
  }

  function addClient(newClient) {
    setClientes((currentClients) => [
      ...currentClients,
      newClient,
    ])

    saveItem(
      STORES.CLIENTES,
      newClient,
    ).catch(console.error)
  }

  function updateClient(updatedClient) {
    setClientes((currentClients) =>
      currentClients.map((cliente) =>
        cliente.id === updatedClient.id
          ? updatedClient
          : cliente,
      ),
    )

    saveItem(
      STORES.CLIENTES,
      updatedClient,
    ).catch(console.error)
  }

  function deleteClient(clientId) {
    const confirmed = window.confirm(
      '¿Querés eliminar este cliente?',
    )

    if (!confirmed) return

    setClientes((currentClients) =>
      currentClients.filter(
        (cliente) => cliente.id !== clientId,
      ),
    )

    deleteItem(
      STORES.CLIENTES,
      clientId,
    ).catch(console.error)
  }

  function addProduct(newProduct) {
    setProductos((currentProducts) => [
      ...currentProducts,
      newProduct,
    ])

    saveItem(
      STORES.PRODUCTOS,
      newProduct,
    ).catch(console.error)
  }

  function updateProduct(updatedProduct) {
    setProductos((currentProducts) =>
      currentProducts.map((producto) =>
        producto.id === updatedProduct.id
          ? updatedProduct
          : producto,
      ),
    )

    saveItem(
      STORES.PRODUCTOS,
      updatedProduct,
    ).catch(console.error)
  }

  function deleteProduct(productId) {
    const confirmed = window.confirm(
      '¿Querés eliminar este producto?',
    )

    if (!confirmed) return

    setProductos((currentProducts) =>
      currentProducts.filter(
        (producto) => producto.id !== productId,
      ),
    )

    deleteItem(
      STORES.PRODUCTOS,
      productId,
    ).catch(console.error)
  }

  function saveOrder(order) {
    setPedidos((currentOrders) => {
      const exists = currentOrders.some(
        (currentOrder) =>
          currentOrder.id === order.id,
      )

      if (exists) {
        return currentOrders.map(
          (currentOrder) =>
            currentOrder.id === order.id
              ? order
              : currentOrder,
        )
      }

      return [...currentOrders, order]
    })

    saveItem(
      STORES.PEDIDOS,
      order,
    ).catch(console.error)
  }

  function editOrder(order) {
    setPedidoEditando(order)
    setCurrentPage('nuevo-pedido')
  }

  function readOrder(orderId) {
    const order = pedidos.find(
      (currentOrder) =>
        currentOrder.id === orderId,
    )

    if (!order) return

    const updatedOrder = {
      ...order,
      estado: 'leido',
      editado: false,
    }

    setPedidos((currentOrders) =>
      currentOrders.map((currentOrder) =>
        currentOrder.id === orderId
          ? updatedOrder
          : currentOrder,
      ),
    )

    saveItem(
      STORES.PEDIDOS,
      updatedOrder,
    ).catch(console.error)
  }

  function deleteOrder(orderId) {
    const confirmed = window.confirm(
      '¿Querés eliminar este pedido definitivamente?',
    )

    if (!confirmed) return

    setPedidos((currentOrders) =>
      currentOrders.filter(
        (order) => order.id !== orderId,
      ),
    )

    deleteItem(
      STORES.PEDIDOS,
      orderId,
    ).catch(console.error)
  }

  function finishOrder() {
    setPedidoEditando(null)
    setCurrentPage('pedidos')
  }
  function applyImportedBackup(importedData) {
  setClientes(importedData.clientes)
  setProductos(importedData.productos)
  setPedidos(importedData.pedidos)
}

function renderPage() {
  if (currentPage === 'inicio') {
    return <Home onNavigate={navigate} />
  }

  if (currentPage === 'mas') {
    return (
      <Mas
        onGoHome={() => setCurrentPage('inicio')}
        onBackupImported={applyImportedBackup}
      />
    )
  }

  // acá continúan clientes, productos, pedidos, etc.
    

    if (currentPage === 'clientes') {
      return (
        <Clientes
          clientes={clientes}
          onAddClient={addClient}
          onUpdateClient={updateClient}
          onDeleteClient={deleteClient}
          onGoHome={() =>
            setCurrentPage('inicio')
          }
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
          onGoHome={() =>
            setCurrentPage('inicio')
          }
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
          onReadOrder={readOrder}
          onGoHome={() =>
            setCurrentPage('inicio')
          }
        />
      )
    }

    return (
      <main className="temporary-page">
        <button
          className="back-button"
          type="button"
          onClick={() =>
            setCurrentPage('inicio')
          }
        >
          ← Inicio
        </button>

        <h1>Huerpas Program</h1>
      </main>
    )
  }

  if (loading) {
    return (
      <div className="app-shell">
        <main className="page">
          <p>Cargando Huerpas Program...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {renderPage()}
    </div>
  )
}

export default App