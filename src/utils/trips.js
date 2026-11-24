export const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
export const formatMoney = (cents) => money.format(cents / 100)

export const methods = ['Efectivo', 'Transferencia', 'Cheque', 'Otro']
export const movementTypes = ['Gasto', 'Ingreso de caja', 'Retiro']
export const paymentFields = {
  facturado: 'Importe facturado',
  saldoAnterior: 'Saldo anterior',
  efectivo: 'Efectivo',
  transferencia: 'Transferencias',
}

export function parseMoney(value, signed = false) {
  const text = String(value).trim()
  if (!text) return 0
  // Accept Argentine grouping or a plain decimal entry from a numeric keyboard.
  const grouped = /^-?\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)
  const normalized = (grouped ? text.replaceAll('.', '') : text).replace(',', '.')
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null
  const [whole, decimal = ''] = normalized.replace(/^-/, '').split('.')
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || (!signed && normalized.startsWith('-'))) return null
  return normalized.startsWith('-') ? -cents : cents
}

export function moneyInput(cents) {
  return cents ? (cents / 100).toFixed(2).replace('.', ',') : ''
}

export function rowTotals(row) {
  const cheques = row.cheques.reduce((total, check) => total + check.importe, 0)
  const cobrado = row.efectivo + row.transferencia + cheques
  return { cheques, cobrado, pendiente: row.facturado + (row.saldoAnterior ?? 0) - cobrado }
}

export function tripTotals(trip) {
  const totals = {
    clientes: new Set(trip.filas.map((row) => row.clienteId ?? row.cliente.trim().toLowerCase())).size,
    bultos: 0, facturado: 0, saldoAnterior: 0, efectivo: 0, transferencia: 0,
    cheques: 0, cobrado: 0, pendiente: 0, gastos: 0, ingresos: 0, retiros: 0,
    caja: trip.efectivoInicial,
    saldosDesconocidos: 0, bultosConDetalle: 0,
  }
  const rowKeys = ['facturado', 'saldoAnterior', 'efectivo', 'transferencia', 'cheques', 'cobrado', 'pendiente']
  for (const row of trip.filas) {
    const amounts = { ...row, ...rowTotals(row) }
    for (const key of rowKeys) totals[key] += amounts[key] ?? 0
    if (row.saldoAnterior == null) totals.saldosDesconocidos++
    const bultos = String(row.bultos ?? '').trim()
    if (/^\d+$/.test(bultos) && Number.isSafeInteger(Number(bultos))) totals.bultos += Number(bultos)
    else if (bultos) totals.bultosConDetalle++
  }
  totals.caja += totals.efectivo
  for (const movement of trip.movimientos) {
    const income = movement.tipo === 'Ingreso de caja'
    const key = income ? 'ingresos' : movement.tipo === 'Retiro' ? 'retiros' : 'gastos'
    totals[key] += movement.importe
    if (movement.medio === 'Efectivo') totals.caja += (income ? 1 : -1) * movement.importe
  }
  return totals
}

export const totalLabels = {
  clientes: 'Clientes', bultos: 'Bultos', facturado: 'Facturado', saldoAnterior: 'Saldo anterior',
  efectivo: 'Efectivo cobrado', transferencia: 'Transferencias', cheques: 'Cheques', cobrado: 'Total cobrado',
  pendiente: 'Pendiente neto', gastos: 'Gastos', ingresos: 'Ingresos de caja', retiros: 'Retiros', caja: 'Efectivo esperado',
}

export function formatPreviousBalance(value) {
  return value == null ? 'Desconocido' : formatMoney(value)
}

export function showPending(value, unknown) {
  const amount = showTotal('pendiente', value)
  return unknown ? amount + ' (parcial)' : amount
}

export function tripTotalEntries(trip) {
  const { saldosDesconocidos, bultosConDetalle, ...totals } = tripTotals(trip)
  return Object.entries(totals).map(([key, value]) => {
    const label = key === 'bultos' && bultosConDetalle ? 'Bultos numéricos' : totalLabels[key]
    if (key === 'bultos' && bultosConDetalle) {
      return [label, value + ' · ' + bultosConDetalle + ' filas con texto']
    }
    if (key === 'saldoAnterior' && saldosDesconocidos) {
      return [label, formatMoney(value) + ' conocidos · ' + saldosDesconocidos + ' sin saldo informado']
    }
    return [label, key === 'pendiente' ? showPending(value, saldosDesconocidos > 0) : showTotal(key, value)]
  })
}

export function showTotal(key, value) {
  if (key === 'clientes' || key === 'bultos') return value
  if (key === 'pendiente' && value < 0) return `Crédito ${formatMoney(-value)}`
  return formatMoney(value)
}
