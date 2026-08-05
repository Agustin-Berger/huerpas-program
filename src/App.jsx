import { useEffect, useState } from 'react'
import Home from './pages/Home'
import Clientes from './pages/Clientes'
import Productos from './pages/Productos'
import './App.css'

const CLIENTES_STORAGE_KEY = 'huerpas-clientes'
const PRODUCTOS_STORAGE_KEY = 'huerpas-productos'

function App() {
  const [currentPage, setCurrentPage] = useState('inicio')

  const [clientes, setClientes] = useState(() => {
    try {
      const clientesGuardados = localStorage.getItem(CLIENTES_STORAGE_KEY)

      return clientesGuardados ? JSON.parse(clientesGuardados) : []
    } catch (error) {
      console.error('No se pudieron recuperar los clientes:', error)
      return []
    }
  })

  const [productos, setProductos] = useState(() => {
    try {
      const productosGuardados = localStorage.getItem(PRODUCTOS_STORAGE_KEY)

      return productosGuardados ? JSON.parse(productosGuardados) : []
    } catch (error) {
      console.error('No se pudieron recuperar los productos:', error)
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CLIENTES_STORAGE_KEY, JSON.stringify(clientes))
    } catch (error) {
      console.error('No se pudieron guardar los clientes:', error)
    }
  }, [clientes])

  useEffect(() => {
    try {
      localStorage.setItem(PRODUCTOS_STORAGE_KEY, JSON.stringify(productos))
    } catch (error) {
      console.error('No se pudieron guardar los productos:', error)
    }
  }, [productos])

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

  function renderPage() {
    if (currentPage === 'inicio') {
      return <Home onNavigate={setCurrentPage} />
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

function getPageTitle(page) {
  const titles = {
    pedidos: 'Pedidos',
    mas: 'Más',
    'nuevo-pedido': 'Nuevo pedido',
  }

  return titles[page] || 'Huerpas Program'
}

export default App