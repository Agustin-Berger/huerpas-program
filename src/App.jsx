import { useState } from 'react'
import Home from './pages/Home'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('inicio')

  function renderPage() {
    if (currentPage === 'inicio') {
      return <Home onNavigate={setCurrentPage} />
    }

    return (
      <main className="temporary-page">
        <button
          className="back-button"
          type="button"
          onClick={() => setCurrentPage('inicio')}
        >
          ← Volver
        </button>

        <h1>{getPageTitle(currentPage)}</h1>
        <p>Esta pantalla será desarrollada en el próximo paso.</p>
      </main>
    )
  }

  return <div className="app-shell">{renderPage()}</div>
}

function getPageTitle(page) {
  const titles = {
    clientes: 'Clientes',
    productos: 'Productos',
    pedidos: 'Pedidos',
    mas: 'Más',
    'nuevo-pedido': 'Nuevo pedido',
  }

  return titles[page] || 'Huerpas Program'
}

export default App