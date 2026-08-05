function MenuButton({ icon, title, description, onClick }) {
  return (
    <button className="menu-item" type="button" onClick={onClick}>
      <span className="menu-item-icon">{icon}</span>

      <span className="menu-item-text">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>

      <span className="menu-item-arrow">›</span>
    </button>
  )
}

export default MenuButton