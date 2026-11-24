export default function Quantity({ label, value, onChange, min = 0 }) {
  return <div className="quantity-control compact-quantity">
    <button type="button" aria-label={`Restar ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
    <input type="text" inputMode="numeric" aria-label={`Cantidad de ${label}`}
      value={value || ''} placeholder="0"
      onChange={({ target }) => {
        if (!/^\d*$/.test(target.value)) return
        const number = Number(target.value)
        if (Number.isSafeInteger(number)) onChange(number)
      }}
      onBlur={() => { if (value < min) onChange(min) }}
    />
    <button type="button" aria-label={`Sumar ${label}`} onClick={() => {
      if (Number.isSafeInteger(value + 1)) onChange(value + 1)
    }}>+</button>
  </div>
}
