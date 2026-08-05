import { useEffect, useState } from 'react'
import Home from './pages/Home'
import Clientes from './pages/Clientes'
import './App.css'

const CLIENTES_STORAGE_KEY = 'huerpas-clientes'

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

  useEffect(() => {
    try {
      localStorage.setItem(CLIENTES_STORAGE_KEY, JSON.stringify(clientes))
    } catch (error) {
      console.error('No se pudieron guardar los clientes:', error)
    }
  }, [clientes])

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
    productos: 'Productos',
    pedidos: 'Pedidos',
    mas: 'Más',
    'nuevo-pedido': 'Nuevo pedido',
  }

  return titles[page] || 'Huerpas Program'
}

export default App