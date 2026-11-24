import MenuButton from '../components/MenuButton'

function Home({ onNavigate }) {
  return (
    <main className="home">
      <header className="header">
        <div>
          <p className="brand-small">HUERPAS</p>
          <h1>Program</h1>
        </div>

        <span className="version">v0.1</span>
      </header>

      <section className="intro">
        <p>Buen día</p>
        <h2>¿Qué pedido vamos a cargar?</h2>
      </section>

      <button
        className="client-search"
        type="button"
        onClick={() => onNavigate('clientes')}
      >
        <span>🔍</span>
        Buscar cliente
      </button>

      <button
        className="new-order-button"
        type="button"
        onClick={() => onNavigate('nuevo-pedido')}
      >
        <span className="new-order-icon">＋</span>

        <span>
          <strong>Nuevo pedido</strong>
          <small>Seleccionar cliente y comenzar</small>
        </span>
      </button>

      <nav className="menu">
        <MenuButton
          icon="👥"
          title="Clientes"
          description="Ver y administrar clientes"
          onClick={() => onNavigate('clientes')}
        />

        <MenuButton
          icon="📦"
          title="Productos"
          description="Códigos y descripciones"
          onClick={() => onNavigate('productos')}
        />

        <MenuButton
          icon="📝"
          title="Pedidos"
          description="Pedidos guardados y enviados"
          onClick={() => onNavigate('pedidos')}
        />

        <MenuButton
          icon="🚚"
          title="Planilla de viaje"
          description="Cobros, reparto y gastos"
          onClick={() => onNavigate('viajes')}
        />

        <MenuButton
          icon="•••"
          title="Más"
          description="Datos, respaldos y configuración"
          onClick={() => onNavigate('mas')}
        />
      </nav>

      <footer className="footer">
        <span className="status-dot" />
        Funcionamiento local activo
      </footer>
    </main>
  )
}

export default Home